import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized - Session Expired
    if (res.status === 401) {
      // Only redirect if not already on login page to prevent infinite loop
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
        window.location.href = '/login?session=expired';
      }
      throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json.error) {
        message = json.error;
      }
    } catch (e) {
      // Not JSON, use text
    }
    throw new Error(message || res.statusText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 60 * 1000, // 30분: 데이터 신선도 유지 기간 (데이터 절약)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
