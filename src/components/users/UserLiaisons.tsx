
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { useState } from "react";
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

  const availableLiaisons = liaisons.filter(
    (l) =>
      l.active &&
      !clientLiaisons?.some(
        (cl) => cl.client_id === userId && cl.liaison_id === l.id
      )
  );

  const assignedLiaisons = clientLiaisons
    ?.filter((cl) => cl.client_id === userId)
    .map((cl) => liaisons?.find((l) => l.id === cl.liaison_id))
    .filter((l): l is Liaison => l !== undefined);

  const handleSave = async () => {
    for (const liaisonId of selectedLiaisons) {
      await onAssignLiaison(userId, liaisonId);
    }
    setSelectedLiaisons([]);
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
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onRemoveLiaison(userId, liaison.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      
      {availableLiaisons.length > 0 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDialogOpen(true)}
            className="ml-2"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter des liaisons</DialogTitle>
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
                        onCheckedChange={(checked) => 
                          handleCheckboxChange(liaison.id, checked as boolean)
                        }
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
                <Button onClick={handleSave} disabled={selectedLiaisons.length === 0}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
