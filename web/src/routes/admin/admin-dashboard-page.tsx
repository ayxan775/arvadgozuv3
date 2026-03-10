import { useQuery } from '@tanstack/react-query';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function AdminDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => api.getAdminSummary(),
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => api.getAdminAuditLogs(),
  });

  const adminSystemCards = summaryQuery.data
    ? [
        { label: 'Pending sync', value: String(summaryQuery.data.pendingSyncCount) },
        { label: 'Push status', value: summaryQuery.data.pushStatus },
        { label: 'Active users', value: String(summaryQuery.data.activeUsers) },
      ]
    : [];

  const adminAuditPreview = auditQuery.data?.items ?? [];

  return (
    <PageShell
      title="Admin dashboard"
      description="Sistem vəziyyəti, sync health və audit preview üçün sakit, daha peşəkar admin səhnəsi."
      actions={<Badge variant="success">System stable</Badge>}
      className="pb-8"
    >
      <section className="grid gap-4 xl:grid-cols-3">
        {summaryQuery.isLoading
          ? [1, 2, 3].map((item) => <Card key={item} className="h-[126px] animate-pulse bg-white/50" />)
          : adminSystemCards.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Audit preview</CardTitle>
          <CardDescription>Son sistem hərəkətləri admin tərəfindən bir baxışda görünəcək.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {adminAuditPreview.length === 0 && !auditQuery.isLoading ? (
            <div className="rounded-[22px] border border-dashed border-border bg-white/60 px-4 py-6 text-sm text-muted">
              Audit log hələ görünmür.
            </div>
          ) : null}

          {adminAuditPreview.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-border bg-white/75 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-text">{entry.actor}</p>
                <p className="text-sm text-muted">
                  {entry.action} / {entry.entity}
                </p>
              </div>
              <p className="text-xs text-muted">{entry.time ? formatDate(entry.time) : 'Tarix yoxdur'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
