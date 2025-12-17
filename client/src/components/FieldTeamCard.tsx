import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Calendar } from "lucide-react";

export interface FieldTeam {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
  memberCount: number;
  materialCount: number;
  lastActivity: string;
  isActive: boolean;
}

interface FieldTeamCardProps {
  team: FieldTeam;
  onClick: (team: FieldTeam) => void;
}

export function FieldTeamCard({ team, onClick }: FieldTeamCardProps) {
  return (
    <Card
      className="cursor-pointer hover-elevate active-elevate-2"
      onClick={() => onClick(team)}
      data-testid={`card-team-${team.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{team.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{team.divisionName}</p>
        </div>
        {team.isActive ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
            활성
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0">
            비활성
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>팀원 {team.memberCount}명</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>보유 자재 {team.materialCount}종</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>최근 활동: {team.lastActivity}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
