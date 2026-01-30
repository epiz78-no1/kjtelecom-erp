import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Division {
  id: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
  rankOrder: number;
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
  name?: string;
}

interface Permissions {
  incoming: 'none' | 'read' | 'write' | 'own_only';
  outgoing: 'none' | 'read' | 'write' | 'own_only';
  usage: 'none' | 'read' | 'write' | 'own_only';
  inventory: 'none' | 'read' | 'write' | 'own_only';
}

interface LoginData {
  username: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  role: string;
  permissions?: Permissions;
  divisionId?: string;
  teamId?: string;
  isActive: boolean;
}

interface AppContextType {
  divisions: Division[];
  divisionsLoading: boolean;
  addDivision: (name: string) => Promise<void>;
  updateDivision: (id: string, name: string) => Promise<void>;
  deleteDivision: (id: string) => Promise<void>;
  teams: FieldTeam[];
  teamsLoading: boolean;
  addTeam: (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity"> & { memberIds?: string[] }) => Promise<void>;
  updateTeam: (id: string, updates: Partial<FieldTeam> & { memberIds?: string[] }) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  refetchTeams: () => void;
  positions: Position[];
  positionsLoading: boolean;
  user: User | null;
  tenants: Tenant[];
  currentTenant?: string;
  isLoading: boolean;
  logout: () => Promise<void>;
  login: (credentials: LoginData) => Promise<void>;
  refetchAuth: () => void;
  checkPermission: (menu: keyof Permissions, requiredLevel: 'read' | 'write' | 'own_only') => boolean;
  setTenant: (tenantId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Don't fetch auth on login/register pages to prevent 401 toast
  const isAuthPage = location.startsWith('/login') || location.startsWith('/register');

  // Fetch current user from /api/auth/me
  const authQuery = useQuery<{ user: User; tenants: Tenant[]; currentTenant: string }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isAuthPage, // Don't run on auth pages
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // 세션 관련 데이터 정리
      localStorage.removeItem('lastActivity');
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiRequest("POST", "/api/auth/switch-tenant", { tenantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.reload(); // Reload to ensure clean state with new tenant
    },
  });

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setTenant = async (tenantId: string) => {
    await switchTenantMutation.mutateAsync(tenantId);
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (credentials: LoginData) => {
    await loginMutation.mutateAsync(credentials);
  };

  const refetchAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  // 주기적 세션 체크 (20초마다 - 테스트용)
  useEffect(() => {
    if (!authQuery.data?.user || isAuthPage) return;

    const checkSession = async () => {
      try {
        await fetch('/api/auth/session', { credentials: 'include' });
      } catch (error) {
        // 401 에러는 queryClient에서 자동으로 로그인 페이지로 리다이렉트
        console.error('Session check failed:', error);
      }
    };

    // 5분마다 세션 체크
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authQuery.data?.user, isAuthPage]);

  // 활동 추적 및 타이머 (1분 비활동 시 로그아웃 - 테스트용)
  useEffect(() => {
    // 로그인되지 않았거나 로그인/회원가입 페이지에서는 활동 추적 비활성화
    if (!authQuery.data?.user || isAuthPage) return;

    console.log('[Activity Tracker] 활동 추적 활성화');

    const updateLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // 사용자 활동 감지
    window.addEventListener('mousemove', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('click', updateLastActivity);

    // 초기 활동 시간 설정
    updateLastActivity();

    // 1분마다 비활동 체크
    const checkInactivity = () => {
      const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
      const elapsed = Date.now() - lastActivity;
      const SESSION_TIMEOUT = 60 * 60 * 1000; // 1시간

      if (elapsed >= SESSION_TIMEOUT) {
        console.log('세션 만료: 비활동 시간 초과');
        localStorage.removeItem('lastActivity');
        window.location.href = '/login';
      }
    };

    const timer = setInterval(checkInactivity, 60 * 1000);

    return () => {
      console.log('[Activity Tracker] 활동 추적 비활성화');
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      clearInterval(timer);
    };
  }, [authQuery.data?.user, isAuthPage]);

  const divisionsQuery = useQuery<Division[]>({
    queryKey: ["/api/divisions"],
    enabled: !!authQuery.data?.user,
  });

  const teamsQuery = useQuery<FieldTeam[]>({
    queryKey: ["/api/teams"],
    enabled: !!authQuery.data?.user,
  });

  const positionsQuery = useQuery<Position[]>({
    queryKey: ["/api/admin/positions"],
    enabled: !!authQuery.data?.user,
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
    mutationFn: async (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity"> & { memberIds?: string[] }) => {
      await apiRequest("POST", "/api/teams", {
        name: team.name,
        divisionId: team.divisionId,
        memberCount: team.memberCount,
        isActive: team.isActive,
        memberIds: team.memberIds // Pass memberIds to API
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FieldTeam> & { memberIds?: string[] } }) => {
      await apiRequest("PATCH", `/api/teams/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
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

  const addTeam = async (team: Omit<FieldTeam, "id" | "divisionName" | "materialCount" | "lastActivity"> & { memberIds?: string[] }) => {
    await addTeamMutation.mutateAsync(team);
  };

  const updateTeam = async (id: string, updates: Partial<FieldTeam> & { memberIds?: string[] }) => {
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
        positions: positionsQuery.data || [],
        positionsLoading: positionsQuery.isLoading,
        user: authQuery.data?.user || null,
        tenants: authQuery.data?.tenants || [],
        currentTenant: authQuery.data?.currentTenant,
        isLoading: authQuery.isLoading,
        logout,
        login,
        refetchAuth,
        checkPermission: (menu: keyof Permissions, requiredLevel: 'read' | 'write' | 'own_only') => {
          const tenant = authQuery.data?.tenants.find(t => t.id === authQuery.data?.currentTenant);
          if (!tenant) return false;

          // Owners and Admins always have full access
          if (tenant.role === 'owner' || tenant.role === 'admin') return true;

          if (!tenant.permissions) return false;

          const userPerm = tenant.permissions[menu];
          if (userPerm === 'none') return false;

          if (requiredLevel === 'write') {
            return userPerm === 'write';
          }

          if (requiredLevel === 'own_only') {
            return userPerm === 'write' || userPerm === 'own_only';
          }

          if (requiredLevel === 'read') {
            // write, own_only, read all allow "viewing" the page, 
            // but own_only implies filtered view. 
            // The caller needs to handle filtering if checkPermission('read') returns true but permission is 'own_only'.
            return true;
          }

          return false;
        },
        setTenant
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
