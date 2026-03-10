import { useQuery } from '@tanstack/react-query';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export function AdminTransactionsPage() {
  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions(),
  });

  return (
    <PageShell
      title="Transactions monitor"
      description="Dəstək və audit araşdırması üçün readonly transaction nəzarət səhnəsi."
      className="pb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Sonrakı mərhələdə server-side filtr və pagination əlavə olunacaq.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(transactionsQuery.data?.items ?? []).map((transaction) => (
            <div key={transaction.id} className="flex flex-col gap-3 rounded-[24px] border border-border bg-white/80 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text">{transaction.title ?? transaction.note ?? transaction.type}</p>
                  <Badge variant={transaction.status === 'pending' ? 'warning' : 'neutral'}>{transaction.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{transaction.counterparty ?? 'Ortaq əməliyyat'}</p>
                <p className="mt-1 text-xs text-muted">{transaction.createdAt ? formatDate(transaction.createdAt) : 'Tarix yoxdur'}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-text">{formatCurrency(transaction.amount)}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{transaction.type}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
