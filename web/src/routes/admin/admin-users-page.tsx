import { useQuery } from '@tanstack/react-query';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function AdminUsersPage() {
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.getAdminUsers(),
  });

  return (
    <PageShell
      title="Users"
      description="İstifadəçi yaratma, deaktiv etmə və vəziyyət nəzarəti üçün ilkin admin masa görünüşü."
      actions={<Button>Yeni user</Button>}
      className="pb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>User management</CardTitle>
          <CardDescription>Sonrakı mərhələdə reset password və status dəyişmə aksiyaları bağlanacaq.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersQuery.isLoading ? [1, 2, 3].map((item) => <Card key={item} className="h-[96px] animate-pulse bg-white/50" />) : null}

          {(usersQuery.data?.items ?? []).map((user) => (
            <div key={user.id} className="flex flex-col gap-4 rounded-[24px] border border-border bg-white/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text">{user.username}</p>
                  <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role}</Badge>
                  <Badge variant={user.status === 'active' ? 'success' : 'warning'}>{user.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">User hesabı backend admin endpoint-dən gəlir.</p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary">Reset password</Button>
                <Button variant="ghost">Status</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
