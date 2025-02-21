
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DocumentDataEditor } from "@/components/documents/DocumentDataEditor";
import { toast } from "sonner";

const ViewDocument = () => {
  const { id } = useParams();

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast.error("Erreur lors du chargement du document");
        throw error;
      }

      if (!data) {
        toast.error("Document non trouvé");
        throw new Error("Document non trouvé");
      }

      return data;
    },
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!document) {
    return <div>Document non trouvé</div>;
  }

  // Obtenez l'URL publique du document
  const { data: { publicUrl } } = supabase.storage
    .from("documents")
    .getPublicUrl(document.file_path);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Document : {document.file_name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualisation du PDF */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Aperçu du document</h2>
          <iframe
            src={publicUrl}
            className="w-full h-[800px] border-0"
            title={document.file_name}
          />
        </Card>

        {/* Éditeur de données */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Données extraites</h2>
          <DocumentDataEditor document={document} />
        </Card>
      </div>
    </div>
  );
};

export default ViewDocument;
