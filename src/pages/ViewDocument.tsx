
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentDataEditor } from "@/components/documents/DocumentDataEditor";
import { Loader2 } from "lucide-react";

const ViewDocument = () => {
  const { id } = useParams<{ id: string }>();

  const { data: document, isLoading, refetch } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!document) {
    return <div>Document non trouvé</div>;
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r">
        <DocumentDataEditor 
          initialData={document} 
          onSave={refetch}
        />
      </div>
      <div className="w-1/2">
        {documentUrl && (
          <iframe
            src={documentUrl}
            className="w-full h-full"
            title="Document Preview"
          />
        )}
      </div>
    </div>
  );
};

export default ViewDocument;
