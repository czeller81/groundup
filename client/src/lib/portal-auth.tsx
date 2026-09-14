import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { useLocale, type Locale } from "./locale";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: Locale;
  role: string;
  beltRank: string | null;
  attendanceCount: number;
  assignedCoachId: string | null;
  adminNotes: string | null;
  accountStatus: string;
  emailVerifiedAt: string | null;
  riskReasons: unknown;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  isStaff: boolean;
  login: (email: string, password: string, discoveryIntent?: boolean) => Promise<void>;
  signup: (data: SignupData) => Promise<{ message?: string }>;
  logout: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale?: Locale;
  discoveryIntent?: boolean;
  website?: string;
  formStartedAt?: number;
  turnstileToken?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { setUserLocale } = useLocale();

  const { data, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/portal/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = data?.user || null;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const isStaff = isAdmin || isCoach;

  useEffect(() => {
    setUserLocale(user?.locale || null);
  }, [setUserLocale, user?.id, user?.locale]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, discoveryIntent }: { email: string; password: string; discoveryIntent?: boolean }) => {
      const res = await apiRequest("POST", "/api/portal/login", { email, password, discoveryIntent });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const res = await apiRequest("POST", "/api/portal/signup", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string, discoveryIntent?: boolean) => {
    await loginMutation.mutateAsync({ email, password, discoveryIntent });
  };

  const signup = async (data: SignupData) => {
    return signupMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isCoach,
        isStaff,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("usePortalAuth must be used within PortalAuthProvider");
  }
  return context;
}
