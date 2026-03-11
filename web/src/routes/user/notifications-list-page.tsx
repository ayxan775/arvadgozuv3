import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { Check, Bell, BellOff } from 'lucide-react';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES } from '@shared/index';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

export function NotificationsListPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 pt-2 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Bildirişlər"
        backTo={ROUTES.dashboard}
        rightSlot={
          hasUnread && (
            <button
              className="flex h-10 items-center justify-center rounded-full px-2 text-xs font-bold text-orange-600 transition active:scale-95 disabled:opacity-50"
              type="button"
              onClick={() => void markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Hamısını oxunmuş et
            </button>
          )
        }
      />
      <PageShell className="pt-2">
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-[22px] bg-black/5 dark:bg-white/5" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
                  <BellOff className="h-8 w-8 text-muted" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-text">Hələ ki bildiriş yoxdur</h3>
                <p className="text-sm text-muted">Yeni əməliyyatlar və yeniliklər barədə bura məlumat gələcək.</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex flex-col gap-2 rounded-[22px] border p-4 transition-all ${
                  notification.isRead 
                    ? 'border-border bg-white/50 opacity-80' 
                    : 'border-orange-200 bg-white shadow-sm ring-1 ring-orange-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${notification.isRead ? 'text-text/70' : 'text-text'}`}>
                      {notification.title}
                    </h4>
                    <p className={`mt-0.5 text-xs ${notification.isRead ? 'text-muted/70' : 'text-muted'}`}>
                      {notification.body}
                    </p>
                    <span className="mt-2 block text-[10px] uppercase tracking-wider text-muted opacity-60">
                      {format(new Date(notification.createdAt), 'd MMMM, HH:mm', { locale: az })}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={() => void markReadMutation.mutate(notification.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-orange-100 hover:text-orange-600"
                      aria-label="Oxunmuş kimi işarələ"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PageShell>
    </div>
  );
}
