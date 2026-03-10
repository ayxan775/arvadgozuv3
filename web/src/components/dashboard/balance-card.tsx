import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';

type Tone = 'accent' | 'success' | 'warning';

const accentMap: Record<Tone, string> = {
  accent: 'from-[#111827] to-[#28374f] text-white',
  success: 'from-[#f7fbf7] to-[#eef8f1] text-text',
  warning: 'from-[#fffaf1] to-[#fff3da] text-text',
};

export function BalanceCard({
  label,
  amount,
  delta,
  tone,
}: {
  label: string;
  amount: number;
  delta: string;
  tone: Tone;
}) {
  return (
    <Card className={cn('overflow-hidden rounded-[30px] border-white/70 bg-gradient-to-br', accentMap[tone])}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardDescription className={cn('text-sm', tone === 'accent' ? 'text-white/70' : 'text-muted')}>
            {label}
          </CardDescription>
          <Badge variant={tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'accent'}>{delta}</Badge>
        </div>
        <CardTitle className={cn('text-3xl sm:text-4xl', tone === 'accent' ? 'text-white' : 'text-text')}>
          {formatCurrency(amount)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-sm leading-6', tone === 'accent' ? 'text-white/74' : 'text-muted')}>
          Gündəlik görünüş üçün nəzərdə tutulmuş premium KPI kartı. Realtime balans və son dəyişimi göstərir.
        </p>
      </CardContent>
    </Card>
  );
}
