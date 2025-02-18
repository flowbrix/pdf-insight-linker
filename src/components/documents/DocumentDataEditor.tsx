
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentData {
  id: string;
  amorce_number: string | null;
  cuve: string | null;
  section_number: string | null;
  equipment_number: string | null;
  cable_type: string | null;
  fibers: string | null;
  scenario: string | null;
  length_number: string | null;
  metrage: number | null;
  cote: string | null;
  extremite_number: string | null;
  extremite_sup_number: string | null;
  extremite_inf_number: string | null;
  segment: string | null;
  cable_diameter: number | null;
  machine: string | null;
  recette: string | null;
  plan_version: string | null;
  activity_type: string | null;
  plan_type: string | null;
}

interface DocumentDataEditorProps {
  initialData: DocumentData;
  onSave: () => void;
}

export const DocumentDataEditor = ({ initialData, onSave }: DocumentDataEditorProps) => {
  const [data, setData] = useState<DocumentData>(initialData);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('documents')
        .update(data)
        .eq('id', data.id);

      if (error) throw error;
      
      toast.success("Modifications enregistrées avec succès");
      onSave();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde des modifications");
    }
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <h2 className="text-2xl font-bold mb-6">Données Extraites</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="amorce">N° Amorce</Label>
            <Input
              id="amorce"
              value={data.amorce_number || ''}
              onChange={(e) => setData({...data, amorce_number: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="cuve">Cuve</Label>
            <Input
              id="cuve"
              value={data.cuve || ''}
              onChange={(e) => setData({...data, cuve: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="section">Section N°</Label>
            <Input
              id="section"
              value={data.section_number || ''}
              onChange={(e) => setData({...data, section_number: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="equipment">N° Équipement</Label>
            <Input
              id="equipment"
              value={data.equipment_number || ''}
              onChange={(e) => setData({...data, equipment_number: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="cableType">Type de Câble</Label>
            <Input
              id="cableType"
              value={data.cable_type || ''}
              onChange={(e) => setData({...data, cable_type: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="metrage">Métrage</Label>
            <Input
              id="metrage"
              type="number"
              value={data.metrage || ''}
              onChange={(e) => setData({...data, metrage: parseFloat(e.target.value)})}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="mt-6">
        Enregistrer les modifications
      </Button>
    </div>
  );
};
