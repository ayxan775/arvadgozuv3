import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageShellProps = PropsWithChildren<{
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function PageShell({ title, description, actions, className, children }: PageShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 pb-32 pt-6',
        className,
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {description ? <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
