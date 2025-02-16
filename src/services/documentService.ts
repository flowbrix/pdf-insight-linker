
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

const simulateProgress = (setter: (value: number) => void, duration: number) => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    if (progress >= 90) {
      clearInterval(interval);
    } else {
      setter(progress);
    }
  }, duration / 20);
  return interval;
};

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
  // 1. Upload du fichier dans le bucket
  const fileExt = file.name.split('.').pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  // Simuler la progression de l'upload
  const uploadInterval = simulateProgress(onUploadProgress, 3000);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // Upload terminé
  clearInterval(uploadInterval);
  onUploadProgress(100);

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

  // Simuler la progression du traitement
  const processingInterval = simulateProgress(onProcessingProgress, 5000);

  // 3. Déclencher le traitement OCR via une Edge Function
  const { error: processingError } = await supabase.functions.invoke('process-document', {
    body: { documentId: document.id }
  });

  if (processingError) {
    throw processingError;
  }

  // Traitement terminé
  clearInterval(processingInterval);
  onProcessingProgress(100);

  return document;
};
