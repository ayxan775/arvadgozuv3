import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ROUTES } from '@shared/index';

import { useAuth } from '@/lib/auth';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface-card rounded-[32px] border border-border px-6 py-5 text-sm text-muted shadow-soft">
        Session yoxlanılır...
      </div>
    </main>
  );
}

export function RequireAuth() {
  const { session, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { session, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to={ROUTES.login} />;
  }

  if (session.role !== 'admin') {
    return <Navigate replace to={ROUTES.dashboard} />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { session, status } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (session.isAuthenticated) {
    return <Navigate replace to={session.role === 'admin' ? ROUTES.admin : ROUTES.dashboard} />;
  }

  return <Outlet />;
}
