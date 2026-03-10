import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LoginRequest, SessionState } from '@shared/index';

import { ApiError, api } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  session: SessionState;
  status: AuthStatus;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  isSubmitting: boolean;
};

const anonymousSession: SessionState = {
  isAuthenticated: false,
  userId: null,
  username: null,
  role: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      try {
        const response = await api.me();
        return response.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return anonymousSession;
        }

        throw error;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginRequest) => {
      await api.login(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      await queryClient.refetchQueries({ queryKey: ['auth', 'session'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.logout();
    },
    onSuccess: async () => {
      queryClient.setQueryData(['auth', 'session'], anonymousSession);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });

  const value = useMemo<AuthContextValue>(() => {
    const session = sessionQuery.data ?? anonymousSession;
    const status: AuthStatus = sessionQuery.isLoading
      ? 'loading'
      : session.isAuthenticated
        ? 'authenticated'
        : 'anonymous';

    return {
      session,
      status,
      login: async (payload) => {
        await loginMutation.mutateAsync(payload);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      isSubmitting: loginMutation.isPending || logoutMutation.isPending,
    };
  }, [loginMutation, logoutMutation, sessionQuery.data, sessionQuery.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
