import { Outlet } from 'react-router-dom';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export function AdminLayout() {
  const { session, logout, isSubmitting } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 px-4 py-4 sm:px-6">
      <AdminSidebar />

      <main className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-[32px] border border-white/50 bg-white/55 shadow-floating backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/60 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Admin session</p>
            <p className="text-sm font-medium text-text">{session.username}</p>
          </div>

          <Button variant="secondary" onClick={() => void logout()} disabled={isSubmitting}>
            Çıxış et
          </Button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
