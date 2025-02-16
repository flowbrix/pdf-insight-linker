
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FileDropzone from "@/components/FileDropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProcessDocuments = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAtelier, setSelectedAtelier] = useState<string>("");
  const [selectedLiaison, setSelectedLiaison] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<"SAT" | "Embarquement" | "Cable">("SAT");
  const [selectedType, setSelectedType] = useState<"Qualité" | "Mesures" | "Production">("Qualité");
  const [makeVisible, setMakeVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Réinitialiser l'atelier sélectionné quand le secteur change
  useEffect(() => {
    setSelectedAtelier("");
  }, [selectedSector]);

  const getAteliersBySector = (sector: string) => {
    switch (sector) {
      case "SAT":
        return [
          { id: "repeteur", name: "Répéteur" },
          { id: "seq", name: "SEQ" },
          { id: "roadm", name: "ROADM" },
          { id: "pteq", name: "PTEQ" },
          { id: "bu", name: "BU" },
          { id: "ssg", name: "SSG" },
          { id: "bj", name: "BJ" }
        ];
      case "Embarquement":
        return [
          { id: "embarquement", name: "Embarquement" }
        ];
      case "Cable":
        return [
          { id: "devidage", name: "Dévidage Soudure" },
          { id: "coloration", name: "Coloration" },
          { id: "mise-sous-tube", name: "Mise sous Tube" },
          { id: "jonction-tube", name: "Jonction Tube" },
          { id: "cc", name: "CC" },
          { id: "isolation", name: "Isolation" },
          { id: "gaine", name: "Gaine" },
          { id: "armure", name: "Armure" },
          { id: "basculement", name: "Basculement" }
        ];
      default:
        return [];
    }
  };

  const { data: liaisons } = useQuery({
    queryKey: ["liaisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liaisons")
        .select("*")
        .eq("active", true);
      
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    if (!selectedAtelier) {
      toast.error("Veuillez sélectionner un atelier");
      return;
    }

    if (!selectedSector) {
      toast.error("Veuillez sélectionner un secteur");
      return;
    }

    if (!selectedType) {
      toast.error("Veuillez sélectionner un type de document");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload du fichier dans le bucket
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Créer l'entrée dans la table documents
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert({
          file_name: selectedFile.name,
          file_path: filePath,
          sector: selectedSector,
          document_type: selectedType,
          atelier_id: selectedAtelier,
          liaison_id: selectedLiaison || null,
          client_visible: makeVisible,
        })
        .select()
        .single();

      if (documentError) {
        throw documentError;
      }

      // 3. Déclencher le traitement OCR via une Edge Function (à implémenter)
      const { error: processingError } = await supabase.functions.invoke('process-document', {
        body: { documentId: document.id }
      });

      if (processingError) {
        throw processingError;
      }

      toast.success("Document uploadé avec succès et en cours de traitement");
      
      // Réinitialiser le formulaire
      setSelectedFile(null);
      setSelectedAtelier("");
      setSelectedLiaison("");
      setMakeVisible(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors du traitement du document");
    } finally {
      setIsUploading(false);
    }
  };

  const currentAteliers = getAteliersBySector(selectedSector);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Traiter un Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Document PDF</Label>
            <FileDropzone onFileSelect={handleFileSelect} />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné : {selectedFile.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger id="sector">
                  <SelectValue placeholder="Sélectionnez un secteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAT">SAT</SelectItem>
                  <SelectItem value="Embarquement">Embarquement</SelectItem>
                  <SelectItem value="Cable">Cable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de Document</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Qualité">Qualité</SelectItem>
                  <SelectItem value="Mesures">Mesures</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="atelier">Atelier</Label>
            <Select value={selectedAtelier} onValueChange={setSelectedAtelier}>
              <SelectTrigger id="atelier">
                <SelectValue placeholder="Sélectionnez un atelier" />
              </SelectTrigger>
              <SelectContent>
                {currentAteliers.map((atelier) => (
                  <SelectItem key={atelier.id} value={atelier.id}>
                    {atelier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liaison">Liaison</Label>
            <Select value={selectedLiaison} onValueChange={setSelectedLiaison}>
              <SelectTrigger id="liaison">
                <SelectValue placeholder="Sélectionnez une liaison" />
              </SelectTrigger>
              <SelectContent>
                {liaisons?.map((liaison) => (
                  <SelectItem key={liaison.id} value={liaison.id}>
                    {liaison.reference_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible"
              checked={makeVisible}
              onCheckedChange={(checked) => setMakeVisible(checked as boolean)}
            />
            <Label htmlFor="visible" className="text-sm font-normal">
              Rendre visible au client
            </Label>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? "Traitement en cours..." : "Traiter le Document"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessDocuments;
