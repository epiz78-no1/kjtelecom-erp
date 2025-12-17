import { createContext, useContext, useState, type ReactNode } from "react";
import type { FieldTeam } from "@/components/FieldTeamCard";

interface Division {
  id: string;
  name: string;
}

interface AppContextType {
  divisions: Division[];
  setDivisions: (divisions: Division[]) => void;
  updateDivision: (id: string, name: string) => void;
  teams: FieldTeam[];
  setTeams: (teams: FieldTeam[]) => void;
  addTeam: (team: FieldTeam) => void;
  updateTeam: (id: string, updates: Partial<FieldTeam>) => void;
  deleteTeam: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// todo: remove mock functionality
const initialDivisions: Division[] = [
  { id: "div1", name: "사업부 1" },
  { id: "div2", name: "사업부 2" },
];

// todo: remove mock functionality
const initialTeams: FieldTeam[] = [
  { id: "1", name: "강남 1팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 5, materialCount: 12, lastActivity: "2024-12-15", isActive: true },
  { id: "2", name: "서초 2팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 4, materialCount: 8, lastActivity: "2024-12-14", isActive: true },
  { id: "3", name: "강서 1팀", divisionId: "div1", divisionName: "사업부 1", memberCount: 6, materialCount: 10, lastActivity: "2024-12-12", isActive: true },
  { id: "4", name: "송파 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 6, materialCount: 15, lastActivity: "2024-12-13", isActive: true },
  { id: "5", name: "강동 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 3, materialCount: 6, lastActivity: "2024-12-10", isActive: false },
  { id: "6", name: "광진 1팀", divisionId: "div2", divisionName: "사업부 2", memberCount: 5, materialCount: 9, lastActivity: "2024-12-11", isActive: true },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [teams, setTeams] = useState<FieldTeam[]>(initialTeams);

  const updateDivision = (id: string, name: string) => {
    setDivisions((prev) =>
      prev.map((div) => (div.id === id ? { ...div, name } : div))
    );
    setTeams((prev) =>
      prev.map((team) =>
        team.divisionId === id ? { ...team, divisionName: name } : team
      )
    );
  };

  const addTeam = (team: FieldTeam) => {
    setTeams((prev) => [...prev, team]);
  };

  const updateTeam = (id: string, updates: Partial<FieldTeam>) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === id ? { ...team, ...updates } : team))
    );
  };

  const deleteTeam = (id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        divisions,
        setDivisions,
        updateDivision,
        teams,
        setTeams,
        addTeam,
        updateTeam,
        deleteTeam,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
