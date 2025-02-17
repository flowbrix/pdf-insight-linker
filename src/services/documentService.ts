
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

    // Vérifier que le bucket existe avant l'upload
    const { data: buckets } = await supabase.storage.listBuckets();
    const documentsBucket = buckets?.find(b => b.name === 'documents');
    
    if (!documentsBucket) {
      throw new Error("Le bucket 'documents' n'existe pas");
    }

    console.log('Bucket documents trouvé, démarrage upload...');

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      throw uploadError;
    }

    console.log('Upload réussi, création entrée base de données...');
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
      console.error('Erreur création document:', documentError);
      throw documentError;
    }

    onUploadProgress(100);
    onProcessingProgress(10);

    console.log('Document créé, démarrage du traitement...');

    // 3. Appeler l'Edge Function pour traiter le document
    const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
      body: { documentId: document.id },
    });

    if (processError) {
      console.error('Erreur traitement:', processError);
      throw processError;
    }

    console.log('Résultat du traitement:', processData);
    onProcessingProgress(100);
    
    return document;
  } catch (error) {
    console.error('Error in processDocument:', error);
    throw error;
  }
};
