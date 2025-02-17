
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { type Liaison, type ClientLiaison } from "@/types/user";

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
  return (
    <div className="flex flex-col gap-2">
      <Select onValueChange={(liaisonId) => onAssignLiaison(userId, liaisonId)}>
        <SelectTrigger>
          <SelectValue placeholder="Assigner une liaison" />
        </SelectTrigger>
        <SelectContent>
          {liaisons
            ?.filter(
              (l) =>
                l.active &&
                !clientLiaisons?.some(
                  (cl) => cl.client_id === userId && cl.liaison_id === l.id
                )
            )
            .map((liaison) => (
              <SelectItem key={liaison.id} value={liaison.id}>
                {liaison.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        {clientLiaisons
          ?.filter((cl) => cl.client_id === userId)
          .map((cl) => {
            const liaison = liaisons?.find((l) => l.id === cl.liaison_id);
            return (
              liaison && (
                <Badge key={cl.liaison_id} className="flex items-center gap-1">
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
              )
            );
          })}
      </div>
    </div>
  );
};
