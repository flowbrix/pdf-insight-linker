
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type NewUser, type Liaison } from "@/types/user";

interface CreateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newUser: NewUser;
  onNewUserChange: (user: NewUser) => void;
  onCreateUser: () => Promise<void>;
  liaisons: Liaison[];
}

export const CreateUserDialog = ({
  isOpen,
  onOpenChange,
  newUser,
  onNewUserChange,
  onCreateUser,
  liaisons,
}: CreateUserDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) =>
                onNewUserChange({ ...newUser, email: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input
              id="firstName"
              value={newUser.first_name}
              onChange={(e) =>
                onNewUserChange({ ...newUser, first_name: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input
              id="lastName"
              value={newUser.last_name}
              onChange={(e) =>
                onNewUserChange({ ...newUser, last_name: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={newUser.role}
              onValueChange={(value: "admin" | "operator" | "client") =>
                onNewUserChange({ ...newUser, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="operator">Opérateur</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {newUser.role === "client" && (
            <div className="grid gap-2">
              <Label htmlFor="liaison">Liaison</Label>
              <Select
                value={newUser.liaison_id}
                onValueChange={(value) =>
                  onNewUserChange({ ...newUser, liaison_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une liaison" />
                </SelectTrigger>
                <SelectContent>
                  {liaisons?.filter(l => l.active).map((liaison) => (
                    <SelectItem key={liaison.id} value={liaison.id}>
                      {liaison.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onCreateUser}>Créer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
