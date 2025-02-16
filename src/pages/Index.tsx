
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col items-center justify-center max-w-5xl mx-auto text-center">
      <div className="space-y-6 animate-fade-up">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          PDF Insight Linker
        </h1>
        <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
          Optimisez votre flux de traitement documentaire avec notre technologie OCR intelligente. Extrayez, vérifiez et gérez vos documents PDF efficacement.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/process">
              <Upload className="mr-2 h-5 w-5" />
              Commencer le Traitement
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/documents">
              <FileText className="mr-2 h-5 w-5" />
              Voir les Documents
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Upload}
          title="Traitement Intelligent"
          description="Traitez jusqu'à 150 pages avec une technologie OCR avancée pour une extraction précise des données."
        />
        <FeatureCard
          icon={FileText}
          title="Gestion Documentaire"
          description="Organisez et accédez à vos documents avec des capacités puissantes de filtrage et de recherche."
        />
        <FeatureCard
          icon={Users}
          title="Accès Basé sur les Rôles"
          description="Contrôle d'accès sécurisé avec des rôles d'administrateur, d'opérateur et de client."
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-all hover:shadow-md animate-fade-up">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
