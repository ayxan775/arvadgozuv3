import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { az } from 'date-fns/locale';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES, type NotificationItem } from '@shared/index';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const clearMutation = useMutation({
    mutationFn: () => api.clearNotifications(),
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], { items: [] });
    },
  });

  const notifications = notificationsQuery.data?.items ?? [];

  const groupedNotifications = notifications.reduce((acc: Record<string, { label: string; items: NotificationItem[] }>, item) => {
    const date = new Date(item.createdAt);
    let groupKey = format(date, 'yyyy-MM-dd');
    let label = format(date, 'd MMMM', { locale: az });

    if (isToday(date)) {
      groupKey = 'today';
      label = 'Bu gün';
    } else if (isYesterday(date)) {
      groupKey = 'yesterday';
      label = 'Dünən';
    }

    if (!acc[groupKey]) {
      acc[groupKey] = { label, items: [] };
    }

    const group = acc[groupKey];
    if (group) {
      group.items.push(item);
    }
    
    return acc;
  }, {});

  const getIconData = (type: string) => {
    switch (type) {
      case 'income':
        return { icon: 'payments', className: 'bg-primary/10 text-primary' };
      case 'expense':
        return { icon: 'shopping_cart', className: 'bg-orange-500/10 text-orange-500' };
      case 'transfer':
        return { icon: 'swap_horiz', className: 'bg-blue-500/10 text-blue-500' };
      default:
        return { icon: 'notifications', className: 'bg-slate-500/10 text-slate-500' };
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Bildirişlər"
        backTo={ROUTES.dashboard}
        rightSlot={
          <button
            type="button"
            onClick={() => void clearMutation.mutate()}
            disabled={notifications.length === 0 || clearMutation.isPending}
            className="text-sm font-semibold text-orange-600 transition-opacity hover:opacity-80 dark:text-orange-500 disabled:opacity-30"
          >
            Hamısını təmizlə
          </button>
        }
      />

      <div className="space-y-6 px-4 py-4">
        {Object.keys(groupedNotifications).length === 0 && !notificationsQuery.isPending && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <span className="material-symbols-outlined text-3xl text-slate-400">notifications_off</span>
            </div>
            <p className="text-sm font-medium text-slate-500">Heç bir bildiriş yoxdur</p>
          </div>
        )}

        {Object.entries(groupedNotifications).map(([key, group]) => (
          <section key={key}>
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {group.label}
            </h2>

            <div className="space-y-3">
              {group.items.map((item) => {
                const iconData = getIconData(item.type);
                return (
                  <article
                    key={item.id}
                    className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                        iconData.className,
                      )}
                    >
                      <span className="material-symbols-outlined">{iconData.icon}</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                          {format(new Date(item.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <Link
          to={ROUTES.notificationSettings}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-orange-200 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-orange-500/40"
        >
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Bildiriş ayarları</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Push və digər bildiriş seçimlərini idarə et
            </p>
          </div>
          <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">chevron_right</span>
        </Link>
      </div>
    </main>
  );
}
