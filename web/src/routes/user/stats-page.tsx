import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ROUTES } from '@shared/index';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const monthFormatter = new Intl.DateTimeFormat('az-AZ', { month: 'long', year: 'numeric' });
const weekdayFormatter = new Intl.DateTimeFormat('az-AZ', { weekday: 'short' });

const categoryStyles: Record<string, { icon: string; bg: string; text: string; bar: string }> = {
  qida: { icon: 'restaurant', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600', bar: 'bg-orange-500' },
  nəqliyyat: { icon: 'directions_car', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', bar: 'bg-blue-500' },
  kommunal: { icon: 'bolt', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600', bar: 'bg-purple-500' },
  əyləncə: {
    icon: 'confirmation_number',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-600',
    bar: 'bg-pink-500',
  },
};

function toDateRange(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatCurrency(amount: number) {
  return `₼ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StatsPage() {
  const { session } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonthRange = useMemo(() => toDateRange(monthOffset), [monthOffset]);
  const previousMonthRange = useMemo(() => toDateRange(monthOffset - 1), [monthOffset]);

  const statsQuery = useQuery({
    queryKey: ['stats', 'native', currentMonthRange.start.toISOString(), currentMonthRange.end.toISOString()],
    queryFn: async () => {
      const from = previousMonthRange.start.toISOString();
      const to = currentMonthRange.end.toISOString();

      let page = 1;
      const items: Awaited<ReturnType<typeof api.getTransactions>>['items'] = [];
      let totalPages = 1;

      do {
        const response = await api.getTransactions({ from, to, page, limit: 100 });
        items.push(...response.items);
        totalPages = response.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages && page <= 20);

      const [categoriesResponse, transferUsersResponse] = await Promise.all([
        api.getCategories(),
        api.getTransferUsers().catch(() => ({ items: [] })),
      ]);

      return {
        transactions: items,
        categories: categoriesResponse.items,
        users: transferUsersResponse.items,
      };
    },
  });

  const derived = useMemo(() => {
    const transactions = statsQuery.data?.transactions ?? [];
    const categories = statsQuery.data?.categories ?? [];
    const users = statsQuery.data?.users ?? [];

    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
    const userNameById = new Map(users.map((user) => [user.id, user.username]));

    if (session.userId && session.username) {
      userNameById.set(session.userId, session.username);
    }

    const isInRange = (value: string | undefined, start: Date, end: Date) => {
      if (!value) {
        return false;
      }

      const date = new Date(value);
      return date >= start && date <= end;
    };

    const currentMonthTransactions = transactions.filter((item) =>
      isInRange(item.effectiveAt, currentMonthRange.start, currentMonthRange.end),
    );

    const previousMonthTransactions = transactions.filter((item) =>
      isInRange(item.effectiveAt, previousMonthRange.start, previousMonthRange.end),
    );

    const currentMonthExpenses = currentMonthTransactions.filter((item) => item.type === 'expense');
    const currentMonthIncomes = currentMonthTransactions.filter((item) => item.type === 'income');
    const previousMonthExpenses = previousMonthTransactions.filter((item) => item.type === 'expense');
    const previousMonthIncomes = previousMonthTransactions.filter((item) => item.type === 'income');

    const totalCurrentExpense = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalCurrentIncome = currentMonthIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalPreviousExpense = previousMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalPreviousIncome = previousMonthIncomes.reduce((sum, item) => sum + item.amount, 0);

    const expenseChangePercent = totalPreviousExpense > 0 ? ((totalCurrentExpense - totalPreviousExpense) / totalPreviousExpense) * 100 : 0;
    const incomeChangePercent = totalPreviousIncome > 0 ? ((totalCurrentIncome - totalPreviousIncome) / totalPreviousIncome) * 100 : 0;
    const netCurrent = totalCurrentIncome - totalCurrentExpense;
    const netPrevious = totalPreviousIncome - totalPreviousExpense;
    const netChangePercent = netPrevious !== 0 ? ((netCurrent - netPrevious) / Math.abs(netPrevious)) * 100 : 0;

    const categoryTotals = new Map<string, number>();
    currentMonthExpenses.forEach((item) => {
      const categoryName = (item.categoryId && categoryNameById.get(item.categoryId)) || 'Digər';
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + item.amount);
    });

    const categoryItems = Array.from(categoryTotals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalCurrentExpense > 0 ? (amount / totalCurrentExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const userTotals = new Map<string, { income: number; expense: number }>();
    currentMonthTransactions.forEach((item) => {
      if (item.type !== 'income' && item.type !== 'expense') {
        return;
      }

      const key = userNameById.get(item.actorUserId ?? '') ?? 'Naməlum istifadəçi';
      const current = userTotals.get(key) ?? { income: 0, expense: 0 };

      if (item.type === 'income') {
        current.income += item.amount;
      }

      if (item.type === 'expense') {
        current.expense += item.amount;
      }

      userTotals.set(key, current);
    });

    const userItems = Array.from(userTotals.entries())
      .map(([name, totals]) => ({
        name,
        income: totals.income,
        expense: totals.expense,
        net: totals.income - totals.expense,
      }))
      .sort((a, b) => b.net - a.net);

    return {
      totalCurrentIncome,
      totalCurrentExpense,
      incomeChangePercent,
      expenseChangePercent,
      netCurrent,
      netChangePercent,
      categoryItems,
      userItems,
    };
  }, [
    currentMonthRange.end,
    currentMonthRange.start,
    previousMonthRange.end,
    previousMonthRange.start,
    session.userId,
    session.username,
    statsQuery.data?.categories,
    statsQuery.data?.transactions,
    statsQuery.data?.users,
  ]);

  const monthLabel = useMemo(() => {
    const formatted = monthFormatter.format(currentMonthRange.start);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentMonthRange.start]);

  const canGoNextMonth = monthOffset < 0;

  const trendData = useMemo(() => {
    const labels = [] as Array<{ label: string; income: number; expense: number }>;
    const byDay = new Map<string, { income: number; expense: number }>();

    (statsQuery.data?.transactions ?? []).forEach((item) => {
      if (!item.effectiveAt || (item.type !== 'income' && item.type !== 'expense')) {
        return;
      }

      const d = new Date(item.effectiveAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const current = byDay.get(key) ?? { income: 0, expense: 0 };

      if (item.type === 'income') {
        current.income += item.amount;
      }

      if (item.type === 'expense') {
        current.expense += item.amount;
      }

      byDay.set(key, current);
    });

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      labels.push({
        label: weekdayFormatter
          .format(day)
          .replace('.', '')
          .slice(0, 2),
        income: byDay.get(key)?.income ?? 0,
        expense: byDay.get(key)?.expense ?? 0,
      });
    }

    const max = Math.max(...labels.flatMap((item) => [item.income, item.expense]), 1);
    return labels.map((item) => ({
      ...item,
      incomeWidth: (item.income / max) * 100,
      expenseWidth: (item.expense / max) * 100,
    }));
  }, [statsQuery.data?.transactions]);

  const userDisplayItems = useMemo(() => {
    const myUsername = session.username;

    return derived.userItems.map((entry) => {
      if (myUsername && entry.name === myUsername) {
        return {
          ...entry,
          label: 'Mən',
        };
      }

      if (derived.userItems.length === 2) {
        return {
          ...entry,
          label: 'Həyat yoldaşım',
        };
      }

      return {
        ...entry,
        label: entry.name,
      };
    });
  }, [derived.userItems, session.username]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 dark:bg-[#221610]">
      <MobileNativeHeader
        title="Statistika"
        backTo={ROUTES.dashboard}
        rightSlot={<span className="material-symbols-outlined text-orange-500">calendar_today</span>}
      />

      <div className="px-4 pb-28">
        <div className="flex justify-center pt-3">
          <div className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 dark:bg-orange-500/20">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full text-orange-600 transition hover:bg-orange-500/15 disabled:opacity-40 dark:text-orange-400"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              aria-label="Əvvəlki ay"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{monthLabel}</span>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full text-orange-600 transition hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-orange-400"
              onClick={() => setMonthOffset((prev) => Math.min(prev + 1, 0))}
              aria-label="Növbəti ay"
              disabled={!canGoNextMonth}
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>

        {statsQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
            Statistika yüklənmədi. Zəhmət olmasa səhifəni yeniləyin.
          </div>
        ) : null}

        <section className="mt-4 grid grid-cols-2 gap-3">
          <article className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-800/50 dark:bg-emerald-900/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Gəlir</p>
            <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-200">{formatCurrency(derived.totalCurrentIncome)}</p>
            <p
              className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${derived.incomeChangePercent >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              <span className="material-symbols-outlined text-sm">
                {derived.incomeChangePercent >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(derived.incomeChangePercent).toFixed(0)}%
            </p>
          </article>

          <article className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 dark:border-rose-800/40 dark:bg-rose-900/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Xərc</p>
            <p className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-200">{formatCurrency(derived.totalCurrentExpense)}</p>
            <p
              className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${derived.expenseChangePercent <= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              <span className="material-symbols-outlined text-sm">
                {derived.expenseChangePercent <= 0 ? 'trending_down' : 'trending_up'}
              </span>
              {Math.abs(derived.expenseChangePercent).toFixed(0)}%
            </p>
          </article>
        </section>

        <section className="mt-3 rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-stone-700/50 dark:bg-stone-800/50">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Balans fərqi</p>
            <p className={`text-sm font-bold ${derived.netCurrent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(derived.netCurrent)}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Ötən aya görə {Math.abs(derived.netChangePercent).toFixed(0)}% {derived.netChangePercent >= 0 ? 'yaxşılaşıb' : 'azalıb'}
          </p>
        </section>

        <section className="mb-4 mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-stone-700/50 dark:bg-stone-800/50">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-tight opacity-70">Ailə üzvləri üzrə</h3>
          <div className="space-y-2.5">
            {derived.userItems.length ? (
              userDisplayItems.map((entry) => (
                <div key={entry.name} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-stone-900/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{entry.label}</span>
                    <span className={`font-bold ${entry.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(entry.net)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-emerald-600 dark:text-emerald-400">+ {formatCurrency(entry.income)}</span>
                    <span className="text-rose-600 dark:text-rose-400">- {formatCurrency(entry.expense)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Bu ay üçün gəlir/xərc məlumatı yoxdur.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="px-2 text-xs font-bold uppercase tracking-tight opacity-70">Xərc kateqoriyaları</h3>
          {derived.categoryItems.length ? (
            derived.categoryItems.map((entry) => {
              const key = entry.name.toLocaleLowerCase('az-AZ');
              const style = categoryStyles[key] ?? {
                icon: 'sell',
                bg: 'bg-slate-100 dark:bg-slate-700/60',
                text: 'text-slate-600 dark:text-slate-300',
                bar: 'bg-slate-500',
              };

              return (
                <div
                  key={entry.name}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-stone-700/50 dark:bg-stone-800/50"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
                    <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-end justify-between gap-2">
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-xs font-bold">{formatCurrency(entry.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="mr-3 h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-stone-700">
                        <div
                          className={`h-full rounded-full ${style.bar}`}
                          style={{ width: `${Math.max(entry.percent, 2)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{entry.percent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
              Kateqoriya statistikası üçün xərc əməliyyatı tapılmadı.
            </div>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-stone-700/50 dark:bg-stone-800/50">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-tight opacity-70">Son 7 gün trendi</h3>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">Gəlir</span>
              <span className="text-rose-600 dark:text-rose-400">Xərc</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {trendData.map((day) => (
              <div key={day.label} className="flex items-center gap-2.5">
                <span className="w-7 text-[11px] font-semibold uppercase text-slate-400">{day.label}</span>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${day.incomeWidth}%` }} />
                  </div>
                  <div className="h-1.5 rounded-full bg-rose-100 dark:bg-rose-900/20">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${day.expenseWidth}%` }} />
                  </div>
                </div>
                <div className="w-24 text-right text-[10px] font-semibold">
                  <p className="text-emerald-600 dark:text-emerald-400">+ {formatCurrency(day.income)}</p>
                  <p className="text-rose-600 dark:text-rose-400">- {formatCurrency(day.expense)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {statsQuery.isLoading ? (
          <p className="pt-4 text-center text-sm text-slate-500 dark:text-slate-400">Statistika yüklənir...</p>
        ) : null}
      </div>
    </div>
  );
}
