
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Database, Upload, Home, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
        .single();

      if (error) throw error;
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

  // Déterminer les éléments de navigation en fonction du rôle
  const navItems = [];
  
  // Seulement ajouter "Voir les Documents" si un utilisateur est connecté
  if (session) {
    navItems.push({ 
      title: "Voir les Documents", 
      url: "/documents", 
      icon: FileText 
    });
  }

  // Seuls les admin et operators peuvent voir ces pages
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
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-4 py-2">
            <Link to="/" className="flex items-center space-x-2">
              <Home className="w-5 h-5" />
              <span className="font-bold">ASN DigiSAT</span>
            </Link>
            {session ? (
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {profile ? getInitials(profile) : "..."}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={handleLogin}>
                Se Connecter
              </Button>
            )}
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default Navbar;
