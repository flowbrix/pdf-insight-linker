
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DocumentDataEditor } from "@/components/documents/DocumentDataEditor";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const ViewDocument = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      console.log('Chargement du document avec id:', id);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement du document:', error);
        toast.error("Erreur lors du chargement du document");
        throw error;
      }

      if (!data) {
        console.error('Aucun document trouvé avec id:', id);
        toast.error("Document non trouvé");
        throw new Error("Document non trouvé");
      }

      console.log('Données du document:', data);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement du document...</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        Document non trouvé
      </div>
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from("documents")
    .getPublicUrl(document.file_path);

  const handleSave = async () => {
    console.log('Invalidation des requêtes...');
    await queryClient.invalidateQueries({ queryKey: ["document", id] });
    navigate('/documents');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Document : {document.file_name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Aperçu du document</h2>
          <iframe
            src={publicUrl}
            className="w-full h-[800px] border-0"
            title={document.file_name}
          />
        </Card>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Données extraites</h2>
          <DocumentDataEditor
            initialData={document}
            onSave={handleSave}
          />
        </Card>
      </div>
    </div>
  );
};

export default ViewDocument;
