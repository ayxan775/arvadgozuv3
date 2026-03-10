import { NavLink, Link } from 'react-router-dom';

import { ROUTES } from '@shared/index';

import { cn } from '@/lib/utils';

const items = [
  { to: ROUTES.dashboard, label: 'Ana səhifə', icon: 'home' },
  { to: ROUTES.stats, label: 'Analitika', icon: 'monitoring' },
  { to: ROUTES.fixedExpenses, label: 'Sabit xərclər', icon: 'event_repeat' },
  { to: ROUTES.profile, label: 'Profil', icon: 'person' },
];

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-6 left-1/2 z-30 w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:hidden">
      <div className="flex items-center justify-around px-2 py-3">
        {items.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-col items-center gap-1 px-1 text-slate-400 transition dark:text-slate-500',
                isActive && 'text-orange-600 dark:text-orange-500',
              )
            }
            end={item.to === ROUTES.dashboard}
          >
            {({ isActive }) => (
              <>
                <span className={cn('material-symbols-outlined text-[28px]', isActive && 'fill-1')}>{item.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="relative -top-2 px-1">
          <Link
            className="flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 transition-transform active:scale-90"
            to={ROUTES.transactionNewExpense}
            aria-label="Yeni əməliyyat"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </Link>
        </div>

        {items.slice(2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-col items-center gap-1 px-1 text-slate-400 transition dark:text-slate-500',
                isActive && 'text-orange-600 dark:text-orange-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('material-symbols-outlined text-[28px]', isActive && 'fill-1')}>{item.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
