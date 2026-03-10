import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES } from '@shared/index';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { registerServiceWorker, requestNotificationPermission, subscribeToPush } from '@/lib/service-worker';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const offlineQueue = useOfflineQueue();

  const preferencesQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api.getNotificationPreferences(),
  });

  const updateMutation = useMutation({
    mutationFn: api.updateNotificationPreferences,
    onSuccess: async (data: any) => {
      queryClient.setQueryData(['notifications', 'preferences'], data.preferences);
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const permission = await requestNotificationPermission();

      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      const registration = await registerServiceWorker();

      if (!registration) {
        throw new Error('Service worker registration is unavailable.');
      }

      const subscription = await subscribeToPush(registration);
      return api.subscribePush(subscription);
    },
  });

  const preferences = preferencesQuery.data;
  const notificationSettings = preferences
    ? [
        { key: 'incomeOn' as const, label: 'Yeni gəlir', description: 'Yeni gəlir əlavə olunanda xəbər ver' },
        { key: 'expenseOn' as const, label: 'Yeni xərc', description: 'Xərc yazılanda push və in-app bildiriş göstər' },
        { key: 'transferOn' as const, label: 'Transfer', description: 'Balanslar arası transfer barədə xəbərdar et' },
        { key: 'updateOn' as const, label: 'Redaktə', description: 'Əməliyyat dəyişəndə bildiriş göstər' },
        { key: 'deleteOn' as const, label: 'Silmə', description: 'Əməliyyat silinəndə xəbər ver' },
      ]
    : [];

  async function togglePreference(key: keyof NonNullable<typeof preferences>) {
    if (!preferences) {
      return;
    }

    await updateMutation.mutateAsync({
      ...preferences,
      [key]: !preferences[key],
    });
  }

  const pushError =
    pushMutation.error instanceof ApiError
      ? pushMutation.error.message
      : pushMutation.error instanceof Error
        ? pushMutation.error.message
        : null;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 pt-2 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Bildirişlər"
        backTo={ROUTES.dashboard}
        rightSlot={
          <button
            className="flex h-10 items-center justify-center rounded-full px-2 text-xs font-bold text-orange-600 transition active:scale-95 disabled:opacity-50"
            type="button"
            onClick={() => void pushMutation.mutateAsync()}
            disabled={pushMutation.isPending}
          >
            Push aktiv et
          </button>
        }
      />
      <PageShell
        className="pt-2"
      >
      <Card>
        <CardHeader>
          <CardTitle>Push və offline status</CardTitle>
          <CardDescription>Service Worker, push subscription və offline queue vəziyyəti bir yerdə görünür.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-border bg-white/80 p-4 text-sm text-muted">
            <strong className="block text-text">Offline queue</strong>
            <span>{offlineQueue.items.length} pending item</span>
          </div>
          <div className="rounded-[22px] border border-border bg-white/80 p-4 text-sm text-muted">
            <strong className="block text-text">Push status</strong>
            <span>{pushMutation.isSuccess ? 'Subscribed' : 'Not subscribed'}</span>
          </div>
          <div className="rounded-[22px] border border-border bg-white/80 p-4 text-sm text-muted">
            <strong className="block text-text">Fallback center</strong>
            <span>UI placeholder aktivdir</span>
          </div>
        </CardContent>
      </Card>

      {pushError ? (
        <div className="rounded-[22px] bg-[#fff4f4] px-4 py-3 text-sm text-[#a63939]">{pushError}</div>
      ) : null}

      <div className="grid gap-4">
        {notificationSettings.map((item) => {
          const enabled = Boolean(preferences?.[item.key]);

          return (
          <Card key={item.key}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <button
                aria-label={`${item.label} toggle`}
                className={`relative h-8 w-14 rounded-full transition ${enabled ? 'bg-accent' : 'bg-black/10'}`}
                type="button"
                onClick={() => void togglePreference(item.key)}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-soft transition ${
                    enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">Bu preference backend-də saxlanır və gələcək push fan-out məntiqinə təsir edir.</p>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </PageShell>
    </div>
  );
}
