import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

interface BusinessDivisionSwitcherProps {
  divisions: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BusinessDivisionSwitcher({ divisions, selectedId, onSelect }: BusinessDivisionSwitcherProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
      <Building2 className="h-4 w-4 ml-2 text-muted-foreground" />
      {divisions.map((division) => (
        <Button
          key={division.id}
          variant={selectedId === division.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onSelect(division.id)}
          data-testid={`button-division-${division.id}`}
          className="toggle-elevate"
        >
          {division.name}
        </Button>
      ))}
    </div>
  );
}
