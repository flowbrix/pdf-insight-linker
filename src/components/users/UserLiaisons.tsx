
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
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
  const [selectedLiaisons, setSelectedLiaisons] = useState<string[]>([]);

  const availableLiaisons = liaisons.filter((l) => l.active);

  const assignedLiaisons = clientLiaisons
    ?.filter((cl) => cl.client_id === userId)
    .map((cl) => liaisons?.find((l) => l.id === cl.liaison_id))
    .filter((l): l is Liaison => l !== undefined);

  const assignedLiaisonIds = assignedLiaisons.map((l) => l.id);

  // Initialiser selectedLiaisons avec les liaisons assignées actuelles
  useEffect(() => {
    setSelectedLiaisons(assignedLiaisonIds);
  }, [assignedLiaisonIds]);

  const handleSave = async () => {
    const currentAssignedIds = assignedLiaisons.map((l) => l.id);
    
    // Supprimer les liaisons désélectionnées
    for (const liaisonId of currentAssignedIds) {
      if (!selectedLiaisons.includes(liaisonId)) {
        await onRemoveLiaison(userId, liaisonId);
      }
    }
    
    // Ajouter les nouvelles liaisons
    for (const liaisonId of selectedLiaisons) {
      if (!currentAssignedIds.includes(liaisonId)) {
        await onAssignLiaison(userId, liaisonId);
      }
    }
    
    setIsDialogOpen(false);
  };

  const handleCheckboxChange = (liaisonId: string, checked: boolean) => {
    setSelectedLiaisons((prev) =>
      checked
        ? [...prev, liaisonId]
        : prev.filter((id) => id !== liaisonId)
    );
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
                    checked={selectedLiaisons.includes(liaison.id)}
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
            <Button onClick={handleSave}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
