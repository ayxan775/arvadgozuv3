import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type MobileNativeHeaderProps = {
    title: string;
    backTo: string;
    rightSlot?: ReactNode;
    className?: string;
};

export function MobileNativeHeader({ title, backTo, rightSlot, className }: MobileNativeHeaderProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-40 border-b border-slate-200/80 bg-[#f8f6f6]/90 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md dark:border-slate-800/90 dark:bg-[#221610]/90',
                className,
            )}
        >
            <div className="relative flex min-h-[44px] items-center justify-between">
                <Link
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-800"
                    to={backTo}
                    aria-label="Geri"
                >
                    <span className="material-symbols-outlined text-slate-900 dark:text-slate-100">arrow_back_ios_new</span>
                </Link>

                <h1 className="pointer-events-none absolute left-1/2 max-w-[calc(100%-7rem)] -translate-x-1/2 truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                    {title}
                </h1>

                <div className="relative z-10 flex min-w-10 items-center justify-end rounded-full text-slate-500 dark:text-slate-400">
                    {rightSlot ?? <span className="material-symbols-outlined">more_horiz</span>}
                </div>
            </div>
        </header>
    );
}