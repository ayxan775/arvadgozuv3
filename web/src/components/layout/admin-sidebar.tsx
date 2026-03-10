import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/transactions', label: 'Transactions' },
  { to: '/admin/audit', label: 'Audit log' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminSidebar() {
  return (
    <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] min-w-[240px] flex-col rounded-[32px] border border-white/60 p-4 shadow-floating lg:flex">
      <div className="mb-8 px-3 pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Admin</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Control Center</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {adminLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'rounded-2xl px-4 py-3 text-sm font-medium text-muted transition hover:bg-white/70 hover:text-text',
                isActive && 'bg-white text-text shadow-soft',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 text-sm text-muted">
        Audit, sync status və operational health bu bölmədə bir yerdə idarə olunacaq.
      </div>
    </aside>
  );
}
