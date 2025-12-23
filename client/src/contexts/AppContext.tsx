import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Division {
  id: string;
  name: string;
}

export interface FieldTeam {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
  teamCategory: string;
  memberCount: number;
  materialCount: number;
  lastActivity: string | null;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  role: string;
}

interface AppContextType {
  divisions: Division[];
  divisionsLoading: boolean;
  addDivision: (name: string) => Promise<void>;
  updateDivision: (id: string, name: string) => Promise<void>;
  deleteDivision: (id: string) => Promise<void>;
  teams: FieldTeam[];
  teamsLoading: boolean;
  addTeam: (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity">) => Promise<void>;
  updateTeam: (id: string, updates: Partial<FieldTeam>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  refetchTeams: () => void;
  user: User | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string) => {
    // Mock login
    setUser({ id: "1", username, role: "admin" });
  };

  const logout = () => {
    setUser(null);
  };

  const divisionsQuery = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
  });

  const teamsQuery = useQuery<FieldTeam[]>({
    queryKey: ["/api/teams"],
  });

  const addDivisionMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/divisions", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
    },
  });

  const updateDivisionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await apiRequest("PATCH", `/api/divisions/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const deleteDivisionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/divisions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
    },
  });

  const addTeamMutation = useMutation({
    mutationFn: async (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity">) => {
      await apiRequest("POST", "/api/teams", {
        name: team.name,
        divisionId: team.divisionId,
        memberCount: team.memberCount,
        isActive: team.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FieldTeam> }) => {
      await apiRequest("PATCH", `/api/teams/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const addDivision = async (name: string) => {
    await addDivisionMutation.mutateAsync(name);
  };

  const updateDivision = async (id: string, name: string) => {
    await updateDivisionMutation.mutateAsync({ id, name });
  };

  const deleteDivision = async (id: string) => {
    await deleteDivisionMutation.mutateAsync(id);
  };

  const addTeam = async (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity">) => {
    await addTeamMutation.mutateAsync(team);
  };

  const updateTeam = async (id: string, updates: Partial<FieldTeam>) => {
    await updateTeamMutation.mutateAsync({ id, updates });
  };

  const deleteTeam = async (id: string) => {
    await deleteTeamMutation.mutateAsync(id);
  };

  const refetchTeams = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
  };

  return (
    <AppContext.Provider
      value={{
        divisions: divisionsQuery.data || [],
        divisionsLoading: divisionsQuery.isLoading,
        addDivision,
        updateDivision,
        deleteDivision,
        teams: teamsQuery.data || [],
        teamsLoading: teamsQuery.isLoading,
        addTeam,
        updateTeam,
        deleteTeam,
        refetchTeams,
        user,
        login,
        logout,
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
