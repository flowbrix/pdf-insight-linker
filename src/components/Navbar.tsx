
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Database, Upload, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "operator" | "client";
};

const Navbar = () => {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session?.user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Erreur: Profil non trouvé");
        await supabase.auth.signOut();
        navigate("/auth");
        return null;
      }
      return data as Profile;
    },
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }
    navigate("/");
    toast.success("Déconnexion réussie");
  };

  const handleLogin = () => {
    navigate("/auth");
  };

  const navItems = [];
  
  if (session) {
    navItems.push({ 
      title: "Voir les Documents", 
      url: "/documents", 
      icon: FileText 
    });
  }

  if (profile?.role && ["admin", "operator"].includes(profile.role)) {
    navItems.unshift({ 
      title: "Traiter les Documents", 
      url: "/process", 
      icon: Upload 
    });
    
    if (profile.role === "admin") {
      navItems.push(
        { 
          title: "Gérer les Utilisateurs", 
          url: "/users", 
          icon: Users 
        },
        { 
          title: "Gérer les Liaisons", 
          url: "/liaisons", 
          icon: Database 
        }
      );
    }
  }

  const getInitials = (profile: Profile) => {
    const first = profile.first_name?.charAt(0) || "";
    const last = profile.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || profile.email.charAt(0).toUpperCase();
  };

  return (
    <header className="w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/lovable-uploads/9351f455-202e-460c-9a43-fa3394a83faf.png"
                alt="ASN Logo"
                className="h-8 w-auto"
              />
            </Link>
            
            {session && (
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    className="flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Avatar>
                  <AvatarFallback className="bg-primary text-white">
                    {profile ? getInitials(profile) : "..."}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-secondary hover:text-primary">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleLogin}
                className="bg-primary hover:bg-primary-light text-white"
              >
                Se Connecter
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
