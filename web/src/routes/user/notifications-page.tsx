import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES } from '@shared/index';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NotificationsPage() {
  const notifications = [
    {
      id: '1',
      title: 'Yeni əməliyyat qeydə alındı',
      description: 'Ən son əlavə etdiyiniz əməliyyat uğurla yadda saxlanıldı.',
      time: 'İndi',
    },
    {
      id: '2',
      title: 'Transfer tamamlandı',
      description: 'Balanslar arasında köçürmə uğurla başa çatdı.',
      time: '5 dəqiqə əvvəl',
    },
    {
      id: '3',
      title: 'Xərc yeniləndi',
      description: 'Seçilmiş xərc məlumatında dəyişiklik edildi.',
      time: 'Bu gün',
    },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 pt-2 dark:bg-[#221610]">
      <MobileNativeHeader title="Bütün bildirişlər" backTo={ROUTES.dashboard} />
      <PageShell className="pt-2">
        <div className="grid gap-4">
          {notifications.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600 dark:bg-orange-500/10">
                    {item.time}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">Bildiriş detalları burada göstərilir. Sonradan real backend data ilə əvəz oluna bilər.</p>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Bildiriş ayarları</CardTitle>
              <CardDescription>Push və digər bildiriş seçimlərini ayrıca ayarlar səhifəsindən idarə edin.</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={ROUTES.notificationSettings}
                className="inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Bildiriş ayarlarına keç
              </a>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
