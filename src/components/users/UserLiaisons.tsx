
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { type Liaison, type ClientLiaison } from "@/types/user";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserLiaisonsProps {
  userId: string;
  liaisons: Liaison[];
  clientLiaisons: ClientLiaison[];
  onAssignLiaison: (userId: string, liaisonId: string) => Promise<void>;
  onRemoveLiaison: (userId: string, liaisonId: string) => Promise<void>;
}

export const UserLiaisons = ({
  userId,
  liaisons,
  clientLiaisons,
  onAssignLiaison,
  onRemoveLiaison,
}: UserLiaisonsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLiaisons, setSelectedLiaisons] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const availableLiaisons = liaisons.filter((l) => l.active);

  const assignedLiaisons = clientLiaisons
    ?.filter((cl) => cl.client_id === userId)
    .map((cl) => liaisons?.find((l) => l.id === cl.liaison_id))
    .filter((l): l is Liaison => l !== undefined);

  // Initialiser selectedLiaisons avec les liaisons assignées actuelles
  useEffect(() => {
    const currentLiaisonIds = new Set(assignedLiaisons.map((l) => l.id));
    setSelectedLiaisons(currentLiaisonIds);
  }, [clientLiaisons, userId]);

  const handleSave = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const currentAssignedIds = new Set(assignedLiaisons.map((l) => l.id));
      
      // Supprimer les liaisons désélectionnées
      const removedLiaisons = Array.from(currentAssignedIds).filter(
        id => !selectedLiaisons.has(id)
      );
      
      // Ajouter les nouvelles liaisons
      const addedLiaisons = Array.from(selectedLiaisons).filter(
        id => !currentAssignedIds.has(id)
      );

      // Effectuer les suppressions
      for (const liaisonId of removedLiaisons) {
        await onRemoveLiaison(userId, liaisonId);
      }
      
      // Effectuer les ajouts
      for (const liaisonId of addedLiaisons) {
        await onAssignLiaison(userId, liaisonId);
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des liaisons:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckboxChange = (liaisonId: string, checked: boolean) => {
    setSelectedLiaisons(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(liaisonId);
      } else {
        newSet.delete(liaisonId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-wrap gap-2">
        {assignedLiaisons.map((liaison) => (
          <Badge key={liaison.id} className="flex items-center gap-1">
            {liaison.name}
          </Badge>
        ))}
      </div>
      
      <Button
        variant="ghost"
        onClick={() => setIsDialogOpen(true)}
        className="ml-2"
      >
        Assignation
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestion des liaisons</DialogTitle>
            <DialogDescription>
              Sélectionnez les liaisons à assigner à cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {availableLiaisons.map((liaison) => (
                <div
                  key={liaison.id}
                  className="flex items-center space-x-2 rounded-lg p-2 hover:bg-accent"
                >
                  <Checkbox
                    id={liaison.id}
                    checked={selectedLiaisons.has(liaison.id)}
                    onCheckedChange={(checked) => {
                      handleCheckboxChange(liaison.id, checked === true);
                    }}
                  />
                  <Label htmlFor={liaison.id} className="flex-grow cursor-pointer">
                    {liaison.name}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? "En cours..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
