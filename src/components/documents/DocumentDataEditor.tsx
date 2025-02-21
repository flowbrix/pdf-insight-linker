
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
  const [data, setData] = useState<DocumentData>({
    ...initialData,
    // Ensure all optional fields have at least null as value
    amorce_number: initialData.amorce_number ?? null,
    cuve: initialData.cuve ?? null,
    section_number: initialData.section_number ?? null,
    equipment_number: initialData.equipment_number ?? null,
    cable_type: initialData.cable_type ?? null,
    fibers: initialData.fibers ?? null,
    scenario: initialData.scenario ?? null,
    length_number: initialData.length_number ?? null,
    metrage: initialData.metrage ?? null,
    cote: initialData.cote ?? null,
    extremite_number: initialData.extremite_number ?? null,
    extremite_sup_number: initialData.extremite_sup_number ?? null,
    extremite_inf_number: initialData.extremite_inf_number ?? null,
    segment: initialData.segment ?? null,
    cable_diameter: initialData.cable_diameter ?? null,
    machine: initialData.machine ?? null,
    recette: initialData.recette ?? null,
    plan_version: initialData.plan_version ?? null,
    activity_type: initialData.activity_type ?? null,
    plan_type: initialData.plan_type ?? null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (label: string, field: keyof DocumentData, type: 'text' | 'number' = 'text') => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type={type}
        value={data[field] || ''}
        onChange={(e) => setData({
          ...data,
          [field]: type === 'number' ? 
            e.target.value ? parseFloat(e.target.value) : null 
            : e.target.value || null
        })}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Données Extraites</h2>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-40"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {renderField('N° Amorce', 'amorce_number')}
            {renderField('Cuve', 'cuve')}
            {renderField('Section N°', 'section_number')}
            {renderField('N° Équipement', 'equipment_number')}
            {renderField('Type de Câble', 'cable_type')}
            {renderField('Fibres', 'fibers')}
          </div>
          <div className="space-y-4">
            {renderField('Scénario', 'scenario')}
            {renderField('N° Longueur', 'length_number')}
            {renderField('Métrage', 'metrage', 'number')}
            {renderField('Côté', 'cote')}
            {renderField('N° Extrémité', 'extremite_number')}
            {renderField('Segment', 'segment')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {renderField('N° Extrémité Sup', 'extremite_sup_number')}
            {renderField('N° Extrémité Inf', 'extremite_inf_number')}
            {renderField('Diamètre Câble', 'cable_diameter', 'number')}
          </div>
          <div className="space-y-4">
            {renderField('Machine', 'machine')}
            {renderField('Recette', 'recette')}
            {renderField('Version Plan', 'plan_version')}
            {renderField('Type Activité', 'activity_type')}
            {renderField('Type de Plan', 'plan_type')}
          </div>
        </div>
      </div>
    </div>
  );
};
