import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminSettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Push, upload limits və operational parametrlər üçün admin config scaffold-u."
      actions={<Button variant="secondary">Dəyişiklikləri yadda saxla</Button>}
      className="pb-8"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Push configuration</CardTitle>
            <CardDescription>VAPID key və bildiriş dispatch vəziyyəti bu bölmədə görünəcək.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <div className="rounded-[22px] border border-border bg-white/80 px-4 py-3">Web Push status: enabled</div>
            <div className="rounded-[22px] border border-border bg-white/80 px-4 py-3">Fallback notification center: enabled</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploads and backup</CardTitle>
            <CardDescription>Receipt ölçü limiti və local disk strategy üçün başlanğıc görünüş.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <div className="rounded-[22px] border border-border bg-white/80 px-4 py-3">Receipt limit: 5 MB</div>
            <div className="rounded-[22px] border border-border bg-white/80 px-4 py-3">Backup cadence: daily snapshot</div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
