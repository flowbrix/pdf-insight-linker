
import { supabase } from "@/integrations/supabase/client";
import { DocumentSector, DocumentType } from "@/components/documents/ProcessDocumentForm";
import { toast } from "sonner";

// Fonction pour mapper les clés reçues vers les colonnes de la base
const mapExtractedValues = (extractedValues: Record<string, string>) => {
  return {
    amorce_number: extractedValues["N° AMORCE"] || null,
    cuve: extractedValues["CUVE"] || null,
    section_number: extractedValues["Section N°"] || null,
    equipment_number: extractedValues["N° EQUIPEMENT"] || 
                     extractedValues["B.J. N°"] || 
                     extractedValues["B.E. N°"] || 
                     extractedValues["BU. N°"] || null,
    cable_type: extractedValues["TYPE DE CABLE"] || 
                extractedValues["Type Câble"] || null,
    fibers: extractedValues["FIBRES"] || null,
    scenario: extractedValues["SCENARIO"] || null,
    length_number: extractedValues["N° LONGUEUR"] || 
                  extractedValues["LG 1"] || null,
    metrage: extractedValues["MÉTRAGE"] ? 
             parseFloat(extractedValues["MÉTRAGE"].replace(/[^\d.]/g, '')) : null,
    cote: extractedValues["CÔTÉ"] || null,
    extremite_number: extractedValues["N° EXTREMITE"] || null,
    extremite_sup_number: extractedValues["N° EXTREMITE SUP"] || null,
    extremite_inf_number: extractedValues["N°0 EXTREMITE INF"] || null,
    segment: extractedValues["SEGMENT"] || null,
    cable_diameter: extractedValues["DIAMÈTRE CÂBLE"] ? 
                   parseFloat(extractedValues["DIAMÈTRE CÂBLE"].replace(/[^\d.]/g, '')) : null,
    machine: extractedValues["Machine"] || null,
    recette: extractedValues["Recette"] || null,
    plan_version: extractedValues["Version Plan"] || null,
    activity_type: extractedValues["Type Activité"] || null,
    plan_type: extractedValues["Type de Plan"] || null
  };
};

interface ProcessDocumentParams {
  file: File;
  sector: DocumentSector;
  type: DocumentType;
  atelierId: string;
  liaisonId: string;
  makeVisible: boolean;
  onUploadProgress: (progress: number) => void;
  onProcessingProgress: (progress: number) => void;
  onSuccess?: (documentId: string) => void;
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
  onSuccess,
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

    // 5. Traiter la réponse du webhook Make.com
    const webhookResponse = await response.json();
    console.log('Réponse du webhook avec données extraites:', webhookResponse);

    if (webhookResponse.extracted_values) {
      const mappedData = mapExtractedValues(webhookResponse.extracted_values);
      console.log('Données mappées:', mappedData);

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          ...mappedData,
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour des données extraites:', updateError);
        toast.error("Erreur lors de la mise à jour des données extraites");
      } else {
        console.log('Données extraites mises à jour avec succès');
        toast.success("Document traité avec succès", {
          action: {
            label: "Voir le résultat",
            onClick: () => onSuccess?.(document.id)
          },
        });
      }
    }

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
