
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LengthFilterProps {
  selectedLength: string;
  availableLengths: string[];
  onLengthChange: (value: string) => void;
}

export const LengthFilter = ({ selectedLength, availableLengths, onLengthChange }: LengthFilterProps) => {
  return (
    <Select value={selectedLength} onValueChange={onLengthChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Filtrer par numéro" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les numéros</SelectItem>
        {availableLengths.map((length) => (
          <SelectItem key={length} value={length}>
            {length}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
