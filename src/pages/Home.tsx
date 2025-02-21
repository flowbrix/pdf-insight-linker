
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Users, Database, Upload } from "lucide-react";

const Home = () => {
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
      return data;
    },
  });

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
        <div className="max-w-2xl text-center space-y-6">
          <img
            src="/lovable-uploads/0061bc3f-2132-4524-b06a-3e2293859c4c.png"
            alt="ASN Logo"
            className="h-16 w-16 mx-auto"
          />
          <h1 className="text-4xl font-bold text-secondary">
            Bienvenue sur DigiSAT
          </h1>
          <p className="text-lg text-muted-foreground">
            La plateforme de gestion documentaire de l'ASN pour le traitement intelligent de vos documents PDF.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-secondary">
          Bienvenue sur DigiSAT
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Accédez à tous vos documents et gérez-les efficacement depuis votre tableau de bord.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/documents"
          className="p-6 bg-white rounded-lg shadow-sm border hover:border-primary transition-colors"
        >
          <FileText className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Voir les Documents</h2>
          <p className="text-muted-foreground">
            Consultez et téléchargez tous vos documents traités.
          </p>
        </Link>

        {profile?.role && ["admin", "operator"].includes(profile.role) && (
          <Link
            to="/process"
            className="p-6 bg-white rounded-lg shadow-sm border hover:border-primary transition-colors"
          >
            <Upload className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Traiter les Documents</h2>
            <p className="text-muted-foreground">
              Téléchargez et traitez de nouveaux documents PDF.
            </p>
          </Link>
        )}

        {profile?.role === "admin" && (
          <>
            <Link
              to="/users"
              className="p-6 bg-white rounded-lg shadow-sm border hover:border-primary transition-colors"
            >
              <Users className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Gérer les Utilisateurs</h2>
              <p className="text-muted-foreground">
                Gérez les accès et les rôles des utilisateurs.
              </p>
            </Link>

            <Link
              to="/liaisons"
              className="p-6 bg-white rounded-lg shadow-sm border hover:border-primary transition-colors"
            >
              <Database className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Gérer les Liaisons</h2>
              <p className="text-muted-foreground">
                Configurez et gérez les liaisons du système.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
