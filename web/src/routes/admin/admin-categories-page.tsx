import { useQuery } from '@tanstack/react-query';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function AdminCategoriesPage() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  return (
    <PageShell
      title="Categories"
      description="System və shared kateqoriyalar üçün admin nəzarət görünüşü."
      actions={<Button>Kateqoriya əlavə et</Button>}
      className="pb-8"
    >
      <Card>
        <CardHeader>
          <CardTitle>Shared categories</CardTitle>
          <CardDescription>Bu siyahı sonradan backend `categories` cədvəlinə bağlanacaq.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(categoriesQuery.data?.items ?? []).map((category, index) => (
            <div key={category.name} className="rounded-[24px] border border-border bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: ['#5892ff', '#7fb0ff', '#94d3a2', '#f1c670'][index % 4] }}
                />
                <strong className="text-sm text-text">{category.name}</strong>
              </div>
              <p className="mt-3 text-sm text-muted">Shared category id: {category.id}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
