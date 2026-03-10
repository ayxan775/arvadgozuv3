import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  accent: 'bg-[#eaf2ff] text-[#2d5eb6]',
  success: 'bg-[#eaf7ef] text-[#23734a]',
  warning: 'bg-[#fff6e4] text-[#9a6c17]',
  danger: 'bg-[#fdecec] text-[#a63939]',
  neutral: 'bg-black/5 text-[#4b5563]',
};

export function Badge({
  children,
  className,
  variant = 'neutral',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
