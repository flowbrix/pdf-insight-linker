
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { type Profile } from "@/types/user";

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  editedUser: Partial<Profile>;
  onEditedUserChange: (user: Partial<Profile>) => void;
  onSave: () => Promise<void>;
}

export const EditUserDialog = ({
  isOpen,
  onOpenChange,
  user,
  editedUser,
  onEditedUserChange,
  onSave,
}: EditUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              value={editedUser.first_name || ""}
              onChange={(e) =>
                onEditedUserChange({
                  ...editedUser,
                  first_name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              value={editedUser.last_name || ""}
              onChange={(e) =>
                onEditedUserChange({
                  ...editedUser,
                  last_name: e.target.value,
                })
              }
            />
          </div>
          <Button onClick={onSave}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
