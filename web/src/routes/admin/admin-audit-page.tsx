import { useQuery } from '@tanstack/react-query';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function AdminAuditPage() {
  const auditQuery = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => api.getAdminAuditLogs(),
  });

  return (
    <PageShell
      title="Audit log"
      description="Create, update, delete, sync və admin action log-ları üçün ilkin explorer səhnəsi."
      className="pb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Audit events</CardTitle>
          <CardDescription>Filter panel və payload diff görünüşü sonrakı iterasiyada genişlənəcək.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(auditQuery.data?.items ?? []).map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-border bg-white/80 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-text">{entry.actor}</p>
                <Badge variant="accent">{entry.action}</Badge>
                <Badge variant="neutral">{entry.entity}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">{entry.time ? formatDate(entry.time) : 'Tarix yoxdur'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
