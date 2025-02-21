
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentDataEditor } from "@/components/documents/DocumentDataEditor";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ViewDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: document, isLoading, refetch } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) throw new Error("ID manquant");
      
      const { data, error } = await supabase
        .from("documents")
        .select()
        .match({ id })
        .maybeSingle();

      if (error) {
        console.error("Erreur lors de la récupération du document:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("Document non trouvé");
      }

      return data;
    },
    enabled: !!id
  });

  const { data: documentUrl } = useQuery({
    queryKey: ["document-url", document?.file_path],
    enabled: !!document?.file_path,
    queryFn: async () => {
      const { data } = supabase.storage
        .from("documents")
        .getPublicUrl(document!.file_path);
      return data.publicUrl;
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">
          {document ? `Document: ${document.file_name}` : 'Chargement...'}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !document ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Document non trouvé</h2>
            <p className="text-gray-600 mb-4">
              Le document demandé n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r overflow-auto">
            <DocumentDataEditor 
              initialData={document} 
              onSave={refetch}
            />
          </div>
          <div className="w-1/2">
            {documentUrl ? (
              <iframe
                src={documentUrl}
                className="w-full h-full"
                title="Aperçu du document"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">
                  Impossible de charger l'aperçu du document
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewDocument;
