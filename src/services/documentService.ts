
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
    const BUCKET_NAME = 'documents';
    
    // 1. Upload du fichier dans le bucket
    const fileExt = file.name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    
    onUploadProgress(10);

    console.log(`Tentative d'upload dans le bucket ${BUCKET_NAME}...`);

    const { data: uploadData, error: uploadError } = await supabase.storage
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

    console.log('Document créé, envoi au webhook Make.com...');

    // 3. Obtenir l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // 4. Envoyer les informations au webhook Make.com
    const webhookUrl = 'https://hook.eu2.make.com/dqqxvrkq813xytypmcbvtgt9j9kpv9pj';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        fileUrl: publicUrl,
        fileName: file.name,
        sector,
        documentType: type,
        atelierId,
        liaisonId,
        makeVisible,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de l'envoi au webhook: ${response.statusText}`);
    }

    console.log('Document envoyé avec succès au webhook');
    toast.success("Document envoyé avec succès");
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
