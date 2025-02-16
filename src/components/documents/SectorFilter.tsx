
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Sector = "SAT" | "Embarquement" | "Cable" | "all";

interface SectorFilterProps {
  selectedSector: Sector;
  onSectorChange: (value: Sector) => void;
}

export const SectorFilter = ({ selectedSector, onSectorChange }: SectorFilterProps) => {
  return (
    <Select value={selectedSector} onValueChange={onSectorChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Filtrer par secteur" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les secteurs</SelectItem>
        <SelectItem value="SAT">SAT</SelectItem>
        <SelectItem value="Embarquement">Embarquement</SelectItem>
        <SelectItem value="Cable">Cable</SelectItem>
      </SelectContent>
    </Select>
  );
};
