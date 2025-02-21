
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiaisons } from "@/hooks/useLiaisons";

interface LiaisonFilterProps {
  selectedLiaison: string;
  onLiaisonChange: (value: string) => void;
}

export const LiaisonFilter = ({ selectedLiaison, onLiaisonChange }: LiaisonFilterProps) => {
  const { liaisons } = useLiaisons();

  return (
    <Select value={selectedLiaison} onValueChange={onLiaisonChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Filtrer par liaison" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les liaisons</SelectItem>
        {liaisons?.map((liaison) => (
          <SelectItem key={liaison.id} value={liaison.id}>
            {liaison.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
