import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FileDropzone from "@/components/FileDropzone";
import ProgressIndicators from "./ProgressIndicators";
import { processDocument } from "@/services/documentService";
import { useNavigate } from 'react-router-dom';

export type DocumentSector = "SAT" | "Embarquement" | "Cable";
export type DocumentType = "Qualité" | "Mesures" | "Production";

const ProcessDocumentForm = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAtelier, setSelectedAtelier] = useState<string>("");
  const [selectedLiaison, setSelectedLiaison] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<DocumentSector>("SAT");
  const [selectedType, setSelectedType] = useState<DocumentType>("Qualité");
  const [makeVisible, setMakeVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  const { data: ateliers } = useQuery({
    queryKey: ["ateliers", selectedSector],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ateliers")
        .select("*")
        .eq("sector", selectedSector)
        .eq("active", true);
      
      if (error) throw error;
      return data;
    },
  });

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
    setUploadProgress(0);
    setProcessingProgress(0);
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
    setUploadProgress(0);
    setProcessingProgress(0);

    try {
      const document = await processDocument({
        file: selectedFile,
        sector: selectedSector,
        type: selectedType,
        atelierId: selectedAtelier,
        liaisonId: selectedLiaison,
        makeVisible,
        onUploadProgress: setUploadProgress,
        onProcessingProgress: setProcessingProgress,
        onSuccess: (documentId) => {
          navigate(`/documents/${documentId}`);
        },
      });

      setSelectedFile(null);
      setSelectedAtelier("");
      setSelectedLiaison("");
      setMakeVisible(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors du traitement du document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
            <Select value={selectedSector} onValueChange={(value: DocumentSector) => setSelectedSector(value)}>
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
            <Select value={selectedType} onValueChange={(value: DocumentType) => setSelectedType(value)}>
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
              {ateliers?.map((atelier) => (
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
              {liaisons?.filter(liaison => liaison.active).map((liaison) => (
                <SelectItem key={liaison.id} value={liaison.id}>
                  {liaison.name}
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

        <ProgressIndicators 
          uploadProgress={uploadProgress}
          processingProgress={processingProgress}
        />

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isUploading}
        >
          {isUploading ? "Traitement en cours..." : "Traiter le Document"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProcessDocumentForm;
