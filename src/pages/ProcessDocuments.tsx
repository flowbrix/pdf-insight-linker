
import { useState } from "react";
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

  const { data: ateliers } = useQuery({
    queryKey: ["ateliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ateliers")
        .select("*")
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

    toast.promise(
      async () => {
        // Logique d'upload à implémenter
        await new Promise(resolve => setTimeout(resolve, 2000));
      },
      {
        loading: "Traitement du document en cours...",
        success: "Document traité avec succès",
        error: "Erreur lors du traitement du document"
      }
    );
  };

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

          <Button onClick={handleSubmit} className="w-full">
            Traiter le Document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessDocuments;
