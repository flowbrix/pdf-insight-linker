
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
          Streamline your document processing workflow with intelligent OCR technology. Extract, verify, and manage your PDF documents efficiently.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/process">
              <Upload className="mr-2 h-5 w-5" />
              Start Processing
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/documents">
              <FileText className="mr-2 h-5 w-5" />
              View Documents
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Upload}
          title="Intelligent Processing"
          description="Process up to 150 pages with advanced OCR technology for accurate data extraction."
        />
        <FeatureCard
          icon={FileText}
          title="Document Management"
          description="Organize and access your documents with powerful filtering and search capabilities."
        />
        <FeatureCard
          icon={Users}
          title="Role-Based Access"
          description="Secure access control with administrator, operator, and client user roles."
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
