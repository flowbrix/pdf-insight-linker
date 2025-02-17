
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Profile, type Liaison, type ClientLiaison } from "@/types/user";
import { UserLiaisons } from "./UserLiaisons";
import { EditUserDialog } from "./EditUserDialog";

interface UserListProps {
  profiles: Profile[];
  liaisons: Liaison[];
  clientLiaisons: ClientLiaison[];
  selectedUser: Profile | null;
  editedUser: Partial<Profile>;
  isDialogOpen: boolean;
  onUpdateRole: (userId: string, role: Profile["role"]) => Promise<void>;
  onUpdateStatus: (userId: string, active: boolean) => Promise<void>;
  onDialogOpenChange: (open: boolean) => void;
  onEditUser: (user: Profile) => void;
  onEditedUserChange: (user: Partial<Profile>) => void;
  onSaveEdit: () => Promise<void>;
  onAssignLiaison: (userId: string, liaisonId: string) => Promise<void>;
  onRemoveLiaison: (userId: string, liaisonId: string) => Promise<void>;
}

export const UserList = ({
  profiles,
  liaisons,
  clientLiaisons,
  selectedUser,
  editedUser,
  isDialogOpen,
  onUpdateRole,
  onUpdateStatus,
  onDialogOpenChange,
  onEditUser,
  onEditedUserChange,
  onSaveEdit,
  onAssignLiaison,
  onRemoveLiaison,
}: UserListProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>Liaisons</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles?.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell>
                {profile.first_name || profile.last_name
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`
                  : "Non renseigné"}
              </TableCell>
              <TableCell>{profile.email}</TableCell>
              <TableCell>
                <Select
                  defaultValue={profile.role}
                  onValueChange={(value: Profile["role"]) =>
                    onUpdateRole(profile.id, value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="operator">Opérateur</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge
                  variant={profile.active ? "success" : "destructive"}
                  className="w-24 justify-center"
                >
                  {profile.active ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Switch
                  checked={profile.active}
                  onCheckedChange={(checked) =>
                    onUpdateStatus(profile.id, checked)
                  }
                />
                <EditUserDialog
                  isOpen={isDialogOpen && selectedUser?.id === profile.id}
                  onOpenChange={(open) => {
                    onDialogOpenChange(open);
                    if (open) {
                      onEditUser(profile);
                    }
                  }}
                  user={selectedUser}
                  editedUser={editedUser}
                  onEditedUserChange={onEditedUserChange}
                  onSave={onSaveEdit}
                />
              </TableCell>
              <TableCell>
                {profile.role === "client" && (
                  <UserLiaisons
                    userId={profile.id}
                    liaisons={liaisons}
                    clientLiaisons={clientLiaisons}
                    onAssignLiaison={onAssignLiaison}
                    onRemoveLiaison={onRemoveLiaison}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
