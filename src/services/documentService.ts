
import { supabase } from "@/integrations/supabase/client";
import { DocumentSector, DocumentType } from "@/components/documents/ProcessDocumentForm";

interface ProcessDocumentParams {
  file: File;
  sector: DocumentSector;
  type: DocumentType;
  atelierId: string;
  liaisonId: string;
  makeVisible: boolean;
  onUploadProgress: (progress: number) => void;
  onProcessingProgress: (progress: number) => void;
}

export const processDocument = async ({
  file,
  sector,
  type,
  atelierId,
  liaisonId,
  makeVisible,
  onUploadProgress,
  onProcessingProgress,
}: ProcessDocumentParams) => {
  try {
    // 1. Upload du fichier dans le bucket
    const fileExt = file.name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    
    onUploadProgress(10);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    onUploadProgress(50);

    // 2. Créer l'entrée dans la table documents avec les métadonnées
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        file_path: filePath,
        sector,
        document_type: type,
        atelier_id: atelierId,
        liaison_id: liaisonId || null,
        client_visible: makeVisible,
        status: 'pending',
      })
      .select()
      .single();

    if (documentError) {
      throw documentError;
    }

    onUploadProgress(100);
    onProcessingProgress(10);

    // 3. Déclencher le traitement OCR via une Edge Function
    const { error: processingError } = await supabase.functions.invoke(
      'process-document',
      {
        body: { documentId: document.id },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (processingError) {
      console.error('Processing error:', processingError);
      throw processingError;
    }

    onProcessingProgress(100);

    return document;
  } catch (error) {
    console.error('Error in processDocument:', error);
    throw error;
  }
};
