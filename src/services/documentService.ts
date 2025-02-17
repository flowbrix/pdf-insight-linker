
import { supabase } from "@/integrations/supabase/client";
import { DocumentSector, DocumentType } from "@/components/documents/ProcessDocumentForm";
import { toast } from "sonner";

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
    const BUCKET_NAME = 'documents'; // Standardisation du nom du bucket
    
    // 1. Upload du fichier dans le bucket
    const fileExt = file.name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    
    onUploadProgress(10);

    console.log(`Tentative d'upload dans le bucket ${BUCKET_NAME}...`);

    // Upload direct sans vérification préalable puisque le bucket est public
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      toast.error("Erreur lors de l'upload du document");
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
      toast.error("Erreur lors de l'enregistrement des métadonnées");
      throw documentError;
    }

    onUploadProgress(100);
    onProcessingProgress(10);

    console.log('Document créé, démarrage du traitement...');

    // 3. Appeler l'Edge Function pour traiter le document
    const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
      body: { 
        documentId: document.id,
        filePath: filePath,
        bucketName: BUCKET_NAME // Ajout du nom du bucket pour le traitement
      },
    });

    if (processError) {
      console.error('Erreur traitement:', processError);
      toast.error("Erreur lors du traitement du document");
      throw processError;
    }

    if (!processData) {
      const error = new Error("Aucune donnée reçue du traitement");
      console.error(error);
      toast.error("Le traitement du document n'a pas produit de résultat");
      throw error;
    }

    console.log('Résultat du traitement:', processData);
    toast.success("Document traité avec succès");
    onProcessingProgress(100);
    
    return document;
  } catch (error) {
    console.error('Error in processDocument:', error);
    if (!toast.message) {
      toast.error("Une erreur inattendue s'est produite");
    }
    throw error;
  }
};
