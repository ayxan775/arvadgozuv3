import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES, type DashboardSummary, type TransactionItem } from '@shared/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';

export function DashboardPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [swipedTransactionId, setSwipedTransactionId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [suppressClickId, setSuppressClickId] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const recentQuery = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => api.getDashboardRecent(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const summary: DashboardSummary | undefined = summaryQuery.data;
  const recentTransactions: TransactionItem[] = recentQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);
      setSwipedTransactionId(null);
    },
  });

  function iconByType(type: TransactionItem['type']) {
    if (type === 'income') return 'payments';
    if (type === 'expense') return 'shopping_cart';
    return 'swap_horiz';
  }

  function amountColor(type: TransactionItem['type']) {
    return type === 'income' ? 'text-emerald-500' : 'text-rose-500';
  }

  function amountSign(type: TransactionItem['type']) {
    return type === 'income' ? '+' : '-';
  }

  const myBalanceLabel = 'Mənim balansım';
  const partnerBalanceLabel = summary?.partnerUsername ? `${summary.partnerUsername} balansı` : 'Digər istifadəçi balansı';

  function handleTouchStart(clientX: number, clientY: number) {
    setTouchStartX(clientX);
    setTouchStartY(clientY);
  }

  function handleTouchEnd(id: string, clientX: number, clientY: number) {
    if (touchStartX === null || touchStartY === null) {
      return;
    }

    const deltaX = clientX - touchStartX;
    const deltaY = clientY - touchStartY;

    const isVerticalScroll = Math.abs(deltaY) > 16 && Math.abs(deltaY) > Math.abs(deltaX);

    if (isVerticalScroll) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (deltaX < -68 && Math.abs(deltaY) < 32) {
      setSwipedTransactionId(id);
    } else if (deltaX > 68 && Math.abs(deltaY) < 32 && swipedTransactionId === id) {
      setSwipedTransactionId(null);
    }

    if (Math.abs(deltaX) > 24 && Math.abs(deltaY) < 24) {
      setSuppressClickId(id);
    }

    setTouchStartX(null);
    setTouchStartY(null);
  }

  function typeLabel(transaction: TransactionItem) {
    if (transaction.type === 'income') return 'Gəlir';
    if (transaction.type === 'transfer') return 'Köçürmə';

    const categoryName = categories.find((category) => category.id === transaction.categoryId)?.name;
    return categoryName ?? 'Kateqoriyasız';
  }

  function transactionMainText(transaction: TransactionItem) {
    const fallbackByType =
      transaction.type === 'income' ? 'Gəlir' : transaction.type === 'expense' ? 'Xərc' : 'Köçürmə';

    const rawTitle = transaction.title ?? transaction.note ?? transaction.type;

    if (rawTitle === 'income') return 'Gəlir';
    if (rawTitle === 'expense') return 'Xərc';
    if (rawTitle === 'transfer') return 'Köçürmə';

    return rawTitle || fallbackByType;
  }

  function actorLabel(transaction: TransactionItem) {
    if (transaction.actorUserId === session.userId) {
      return 'Mən';
    }

    return summary?.partnerUsername ?? transaction.counterparty ?? 'Digər istifadəçi';
  }

  function transactionDetail(transaction: TransactionItem) {
    const isMine = transaction.actorUserId === session.userId;
    const otherParty = transaction.counterparty ?? summary?.partnerUsername ?? 'Digər istifadəçi';
    const subject = transaction.title ?? transaction.note ?? 'Qeyd yoxdur';

    if (transaction.type === 'transfer') {
      return isMine ? `Məndən → ${otherParty}` : `${otherParty} → Mənə`;
    }

    if (transaction.type === 'expense') {
      return `Kimə: ${otherParty} • Nəyə: ${subject}`;
    }

    return 'Kimə: Mənə';
  }

  async function handleDelete(transaction: TransactionItem) {
    const isMine = transaction.actorUserId === session.userId;

    if (!isMine) {
      window.alert('Bu sizin əməliyyat deyil.');
      return;
    }

    await deleteMutation.mutateAsync(transaction.id);
  }

  function firstLetters(value: string) {
    const parts = value.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    const first = parts[0] ?? 'U';
    const second = parts[1] ?? '';
    if (!second) return first.slice(0, 1).toUpperCase();
    return `${first.slice(0, 1)}${second.slice(0, 1)}`.toUpperCase();
  }

  const username = session.username ?? 'İstifadəçi';
  const pendingSyncCount = summary?.pendingSyncCount ?? 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#f8f6f6] pb-32 dark:bg-[#221610]">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/85 px-6 py-4 backdrop-blur-xl dark:bg-[#221610]/80">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-600">
            {firstLetters(username)}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Xoş gəlmisiniz</p>
            <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">{username}</h2>
          </div>
        </div>

        <Link
          className="relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-soft transition active:scale-90 dark:bg-slate-800 dark:text-slate-300"
          to={ROUTES.notifications}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {pendingSyncCount > 0 ? (
            <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-orange-500 dark:border-slate-800" />
          ) : null}
        </Link>
      </header>
      <section className="px-6 pt-6">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-floating">
          <div className="relative z-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Ümumi balans</p>
                {summaryQuery.isLoading ? (
                  <div className="mt-1 h-10 w-44 animate-pulse rounded-lg bg-white/20" />
                ) : (
                  <h3 className="mt-1 text-3xl font-bold tracking-tight">{formatCurrency(summary?.totalBalance ?? 0)}</h3>
                )}
              </div>
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <span className="material-symbols-outlined text-white">account_balance_wallet</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="success">Gəlir: {formatCurrency(summary?.todayIncome ?? 0)}</Badge>
                <Badge variant="danger">Xərc: {formatCurrency(summary?.todayExpense ?? 0)}</Badge>
              </div>
              <Link
                className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors hover:bg-white/30"
                to={ROUTES.transactions}
              >
                Detallar <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Link>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 px-6 pt-5">
        {summaryQuery.isLoading ? (
          <>
            <div className="h-[74px] animate-pulse rounded-2xl bg-white/80 dark:bg-slate-800/60" />
            <div className="h-[74px] animate-pulse rounded-2xl bg-white/80 dark:bg-slate-800/60" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-soft dark:border-slate-700/60 dark:bg-slate-800/80">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">{myBalanceLabel}</p>
              <p className="mt-1.5 text-[24px] font-extrabold leading-none text-slate-800 dark:text-slate-100">
                {formatCurrency(summary?.myBalance ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-soft dark:border-slate-700/60 dark:bg-slate-800/80">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">{partnerBalanceLabel}</p>
              <p className="mt-1.5 text-[24px] font-extrabold leading-none text-slate-800 dark:text-slate-100">
                {formatCurrency(summary?.partnerBalance ?? 0)}
              </p>
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 gap-4 px-6 pt-6">
        <div className="flex flex-col items-center gap-2">
          <Link
            className="flex size-14 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-soft transition-transform active:scale-95 dark:bg-slate-800"
            to={ROUTES.transactionNewIncome}
          >
            <span className="material-symbols-outlined text-3xl">add_circle</span>
          </Link>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mədaxil</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link
            className="flex size-14 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-soft transition-transform active:scale-95 dark:bg-slate-800"
            to={ROUTES.transactionNewExpense}
          >
            <span className="material-symbols-outlined text-3xl">remove_circle</span>
          </Link>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Məxaric</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link
            className="flex size-14 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-soft transition-transform active:scale-95 dark:bg-slate-800"
            to={ROUTES.transactionNewTransfer}
          >
            <span className="material-symbols-outlined text-3xl">swap_horiz</span>
          </Link>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Köçürmə</p>
        </div>
      </section>

      <section className="flex items-center justify-between px-6 pb-4 pt-10">
        <h2 className="text-xl font-bold tracking-tight">Son əməliyyatlar</h2>
        <Link className="text-sm font-semibold text-orange-600" to={ROUTES.transactions}>
          Hamısı
        </Link>
      </section>

      <section className="space-y-3 px-6">
        {recentQuery.isLoading
          ? [1, 2, 3].map((item) => <div key={item} className="h-[84px] animate-pulse rounded-2xl bg-white/70 dark:bg-slate-800/60" />)
          : null}

        {!recentQuery.isLoading && recentTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            Hələ əməliyyat görünmür.
          </div>
        ) : null}

        {recentTransactions.slice(0, 10).map((transaction) => (
          <div key={transaction.id} className="relative overflow-hidden rounded-2xl">
            <button
              className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-rose-500 text-xs font-bold text-white"
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete(transaction)}
            >
              {deleteMutation.isPending && swipedTransactionId === transaction.id ? '...' : 'Sil'}
            </button>

            <Link
              className={`relative z-10 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-soft transition-transform duration-200 dark:border-slate-800 dark:bg-slate-800/50 ${swipedTransactionId === transaction.id ? '-translate-x-20' : 'translate-x-0'}`}
              to={`${ROUTES.transactions}/${transaction.id}`}
              onTouchStart={(event) =>
                handleTouchStart(event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0)
              }
              onTouchEnd={(event) =>
                handleTouchEnd(transaction.id, event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0)
              }
              onClick={(event) => {
                if (suppressClickId === transaction.id) {
                  event.preventDefault();
                  setSuppressClickId(null);
                }
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10">
                  <span className="material-symbols-outlined text-[20px]">{iconByType(transaction.type)}</span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{transactionMainText(transaction)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                    <span>{transaction.createdAt ? formatDate(transaction.createdAt) : 'Tarix yoxdur'}</span>
                    <span className="size-1 rounded-full bg-slate-300" />
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      İcra: {actorLabel(transaction)}
                    </span>
                    {transaction.status === 'pending' ? (
                      <>
                        <span className="size-1 rounded-full bg-slate-300" />
                        <span className="text-amber-500">Gözləmədə</span>
                      </>
                    ) : null}
                    <span className="size-1 rounded-full bg-slate-300" />
                    <span className="truncate">{transactionDetail(transaction)}</span>
                  </div>
                </div>
              </div>

              <div className="pl-2 text-right">
                <p className={`text-sm font-extrabold ${amountColor(transaction.type)}`}>
                  {amountSign(transaction.type)}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
                <p className="text-[10px] font-medium text-slate-400">{typeLabel(transaction)}</p>
              </div>
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
