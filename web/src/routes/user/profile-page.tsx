import { Link } from 'react-router-dom';

import { ROUTES, type NotificationPreferences } from '@shared/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { api, ApiError } from '@/lib/api';
import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { useAuth } from '@/lib/auth';
import { registerServiceWorker, requestNotificationPermission, subscribeToPush } from '@/lib/service-worker';
import { useTheme, type ThemeMode } from '@/lib/theme';

export function ProfilePage() {
  const { session, logout, isSubmitting } = useAuth();
  const { mode, resolvedTheme, setMode } = useTheme();
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
        throw new Error('Bildiriş icazəsi verilmədi.');
      }

      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service Worker aktiv deyil.');
      }

      const subscription = await subscribeToPush(registration);
      return api.subscribePush(subscription);
    },
  });

  const preferences = preferencesQuery.data;

  const pushError =
    pushMutation.error instanceof ApiError
      ? pushMutation.error.message
      : pushMutation.error instanceof Error
        ? pushMutation.error.message
        : null;

  const settingItems = [
    { key: 'incomeOn' as const, label: 'Yeni gəlir', desc: 'Mədaxil əlavə olunanda push göstər' },
    { key: 'expenseOn' as const, label: 'Yeni xərc', desc: 'Məxaric yazılanda xəbərdar et' },
    { key: 'transferOn' as const, label: 'Transfer', desc: 'Köçürmələr barədə bildiriş al' },
    { key: 'updateOn' as const, label: 'Redaktə', desc: 'Əməliyyat yenilənəndə xəbərdar ol' },
    { key: 'deleteOn' as const, label: 'Silmə', desc: 'Əməliyyat silinəndə push göstər' },
  ];

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Açıq' },
    { value: 'dark', label: 'Tünd' },
    { value: 'system', label: 'Sistem' },
  ];

  function firstLetters(value: string) {
    const parts = value.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    const first = parts[0] ?? 'U';
    const second = parts[1] ?? '';
    if (!second) return first.slice(0, 1).toUpperCase();
    return `${first.slice(0, 1)}${second.slice(0, 1)}`.toUpperCase();
  }

  async function togglePreference(key: keyof NotificationPreferences) {
    if (!preferences) return;

    await updateMutation.mutateAsync({
      ...preferences,
      [key]: !preferences[key],
    });
  }

  const username = session.username ?? 'İstifadəçi';

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 pt-2 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Profil"
        backTo={ROUTES.dashboard}
        rightSlot={
          <button
            className="flex h-10 items-center justify-center rounded-full px-2 text-xs font-bold text-rose-500 transition active:scale-95 disabled:opacity-50"
            type="button"
            onClick={() => void logout()}
            disabled={isSubmitting}
          >
            Çıxış
          </button>
        }
      />
      <div className="px-6 pt-4">
      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-orange-500/10 text-lg font-bold text-orange-600">
            {firstLetters(username)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{username}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{session.role ?? 'user'}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-700/40">
            <p className="text-[11px] font-medium text-slate-500">Queue</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{offlineQueue.items.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-700/40">
            <p className="text-[11px] font-medium text-slate-500">Push</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{pushMutation.isSuccess ? 'Aktiv' : 'Passiv'}</p>
          </div>
          <Link to={ROUTES.notifications} className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-700/40">
            <p className="text-[11px] font-medium text-slate-500">Detallar</p>
            <p className="text-sm font-bold text-orange-600">Aç</p>
          </Link>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-800/60">
        <div className="mb-3">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Görünüş</p>
          <p className="text-xs text-slate-500">
            Açıq / tünd rejimi seç. Hazırda: {mode === 'system' ? `Sistem (${resolvedTheme === 'dark' ? 'Tünd' : 'Açıq'})` : (mode === 'dark' ? 'Tünd' : 'Açıq')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`h-10 rounded-xl border text-xs font-semibold transition ${isActive
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-800/60">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Push settingləri</p>
            <p className="text-xs text-slate-500">Profil bölməsindən push idarəsini birbaşa et.</p>
          </div>
          <button
            className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
            type="button"
            onClick={() => void pushMutation.mutateAsync()}
            disabled={pushMutation.isPending}
          >
            {pushMutation.isPending ? 'Aktivləşir...' : 'Push aktiv et'}
          </button>
        </div>

        {pushError ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{pushError}</div> : null}

        <div className="space-y-3">
          {settingItems.map((item) => {
            const enabled = Boolean(preferences?.[item.key]);
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-700"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${item.label} toggle`}
                  className={`relative h-8 w-14 rounded-full transition ${enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  onClick={() => void togglePreference(item.key)}
                  disabled={!preferences || updateMutation.isPending}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-soft transition ${enabled ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
