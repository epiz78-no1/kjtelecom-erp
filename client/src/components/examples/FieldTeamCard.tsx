import { FieldTeamCard, type FieldTeam } from "../FieldTeamCard";

// todo: remove mock functionality
const mockTeam: FieldTeam = {
  id: "1",
  name: "강남 1팀",
  divisionId: "div1",
  divisionName: "사업부 1",
  memberCount: 5,
  materialCount: 12,
  lastActivity: "2024-12-15",
  isActive: true,
};

export default function FieldTeamCardExample() {
  return (
    <div className="p-4 max-w-sm">
      <FieldTeamCard
        team={mockTeam}
        onClick={(team) => console.log("클릭:", team.name)}
      />
    </div>
  );
}
