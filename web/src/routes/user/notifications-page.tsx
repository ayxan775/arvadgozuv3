import { Link } from 'react-router-dom';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES } from '@shared/index';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const notificationGroups = [
    {
      id: 'today',
      label: 'Bu gün',
      items: [
        {
          id: '1',
          title: 'Maaş mədaxili',
          description: 'Hesabınıza 2,500 AZN mədaxil olundu.',
          time: '10:30',
          icon: 'payments',
          iconClassName: 'bg-primary/10 text-primary',
        },
        {
          id: '2',
          title: 'Ailə üzvü xərci',
          description: "Ayan 'Market' kateqoriyasında 45 AZN xərclədi.",
          time: '09:15',
          icon: 'family_restroom',
          iconClassName: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
        },
      ],
    },
    {
      id: 'yesterday',
      label: 'Dünən',
      items: [
        {
          id: '3',
          title: 'Aşağı balans xəbərdarlığı',
          description: 'Əsas kart hesabınızda balans 50 AZN-dən aşağıdır.',
          time: '18:45',
          icon: 'warning',
          iconClassName: 'bg-red-500/10 text-red-500 dark:text-red-400',
        },
        {
          id: '4',
          title: 'Kommunal ödəniş',
          description: 'Elektrik enerjisi üçün 32.50 AZN ödəniş uğurla tamamlandı.',
          time: '14:20',
          icon: 'receipt_long',
          iconClassName: 'bg-green-500/10 text-green-600 dark:text-green-400',
        },
      ],
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Bildirişlər"
        backTo={ROUTES.dashboard}
        rightSlot={
          <button
            type="button"
            className="text-sm font-semibold text-orange-600 transition-opacity hover:opacity-80 dark:text-orange-500"
          >
            Hamısını təmizlə
          </button>
        }
      />

      <div className="space-y-6 px-4 py-4">
        {notificationGroups.map((group) => (
          <section key={group.id}>
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {group.label}
            </h2>

            <div className="space-y-3">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      item.iconClassName,
                    )}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{item.time}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                </article>
              ))}
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
