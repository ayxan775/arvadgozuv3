import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES, type TransactionItem } from '@shared/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const filterPills = ['Hamısı', 'Mədaxil', 'Məxaric', 'Transfer', 'Pending'] as const;

const dateOnlyFormatter = new Intl.DateTimeFormat('az-AZ', {
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('az-AZ', {
  hour: '2-digit',
  minute: '2-digit',
});

function getTransactionDate(transaction: TransactionItem) {
  const dateValue = transaction.effectiveAt ?? transaction.createdAt;

  if (!dateValue) {
    return null;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function dateGroupLabel(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - current) / 86_400_000);

  if (diffDays === 0) return 'Bu gün';
  if (diffDays === 1) return 'Dünən';
  return dateOnlyFormatter.format(date);
}

function pillToType(pill: (typeof filterPills)[number]) {
  if (pill === 'Mədaxil') return 'income';
  if (pill === 'Məxaric') return 'expense';
  if (pill === 'Transfer') return 'transfer';
  return null;
}

function transactionIcon(type: TransactionItem['type']) {
  if (type === 'income') return 'payments';
  if (type === 'transfer') return 'swap_horiz';
  return 'shopping_cart';
}

function transactionIconStyle(type: TransactionItem['type']) {
  if (type === 'income') {
    return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400';
  }

  if (type === 'transfer') {
    return 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400';
  }

  return 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400';
}

export function TransactionsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<string>('Hamısı');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'me' | 'partner'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [swipedTransactionId, setSwipedTransactionId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [suppressClickId, setSuppressClickId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const limit = 10;

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 30_000,
  });

  const transferUsersQuery = useQuery({
    queryKey: ['transfer-users'],
    queryFn: () => api.getTransferUsers(),
  });

  const partnerUserId = useMemo(() => {
    return transferUsersQuery.data?.items.find((user) => user.role === 'user')?.id;
  }, [transferUsersQuery.data?.items]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 60_000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', { userFilter, fromDate, toDate, page, limit }],
    queryFn: () =>
      api.getTransactions({
        ...(userFilter === 'me' && session.userId ? { actorUserId: session.userId } : {}),
        ...(userFilter === 'partner' && partnerUserId ? { actorUserId: partnerUserId } : {}),
        ...(fromDate ? { from: new Date(`${fromDate}T00:00:00`).toISOString() } : {}),
        ...(toDate ? { to: new Date(`${toDate}T23:59:59.999`).toISOString() } : {}),
        page,
        limit,
      }),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);
      setSwipedTransactionId(null);
    },
  });

  const categoryMap = useMemo(() => {
    return new Map((categoriesQuery.data?.items ?? []).map((category) => [category.id, category.name]));
  }, [categoriesQuery.data?.items]);

  function actorLabel(transaction: TransactionItem) {
    if (transaction.actorUserId === session.userId) {
      return 'Mən';
    }
    return summaryQuery.data?.partnerUsername ?? transaction.counterparty ?? 'Digər istifadəçi';
  }

  function transactionDetail(transaction: TransactionItem) {
    const isMine = transaction.actorUserId === session.userId;
    const otherParty = transaction.counterparty ?? summaryQuery.data?.partnerUsername ?? 'Digər istifadəçi';
    const subject = transaction.title ?? transaction.note ?? 'Qeyd yoxdur';

    if (transaction.type === 'transfer') {
      return isMine ? `Məndən → ${otherParty}` : `${otherParty} → Mənə`;
    }

    if (transaction.type === 'expense') {
      return `Kimə: ${otherParty} • Nəyə: ${subject}`;
    }

    return 'Kimə: Mənə';
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

  function typeLabel(transaction: TransactionItem) {
    if (transaction.type === 'income') return 'Gəlir';
    if (transaction.type === 'transfer') return 'Köçürmə';

    const categoryName = transaction.categoryId ? categoryMap.get(transaction.categoryId) : null;
    return categoryName ?? 'Kateqoriyasız';
  }

  const filteredTransactions = useMemo(() => {
    const items = transactionsQuery.data?.items ?? [];
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return items
      .filter((transaction) => {
        if (activeFilter === 'Pending') {
          return transaction.status === 'pending';
        }

        if (activeFilter === 'Hamısı') {
          return true;
        }

        const type = pillToType(activeFilter as (typeof filterPills)[number]);

        return type ? transaction.type === type : true;
      })
      .filter((transaction) => {
        if (!normalizedSearch) {
          return true;
        }

        const categoryName = transaction.categoryId ? categoryMap.get(transaction.categoryId) ?? '' : '';

        const searchableText = [
          transaction.title,
          transaction.note,
          transaction.counterparty,
          categoryName,
          transaction.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aDate = getTransactionDate(a)?.getTime() ?? 0;
        const bDate = getTransactionDate(b)?.getTime() ?? 0;

        return bDate - aDate;
      });
  }, [activeFilter, categoryMap, searchQuery, transactionsQuery.data?.items]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionItem[]>();

    filteredTransactions.forEach((transaction) => {
      const date = getTransactionDate(transaction);
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : 'unknown';

      const current = groups.get(key) ?? [];
      current.push(transaction);
      groups.set(key, current);
    });

    return Array.from(groups.entries()).map(([key, items]) => {
      const firstItem = items[0];
      const firstDate = firstItem ? getTransactionDate(firstItem) : null;

      return {
        key,
        title: firstDate ? dateGroupLabel(firstDate) : 'Tarixsiz əməliyyatlar',
        subtitle: firstDate ? dateOnlyFormatter.format(firstDate) : '',
        items,
      };
    });
  }, [filteredTransactions]);

  function renderTransaction(transaction: TransactionItem) {
    const isIncome = transaction.type === 'income';
    const amount = Math.abs(transaction.amount);

    return (
      <div key={transaction.id} className="relative overflow-hidden rounded-2xl">
        <button
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-rose-500 text-xs font-bold text-white"
          type="button"
          disabled={deleteMutation.isPending}
          onClick={() => void deleteMutation.mutateAsync(transaction.id)}
        >
          {deleteMutation.isPending && swipedTransactionId === transaction.id ? '...' : 'Sil'}
        </button>

        <Link
          className={cn(
            'relative z-10 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-soft transition-transform duration-200 dark:border-slate-800 dark:bg-slate-800/60',
            swipedTransactionId === transaction.id ? '-translate-x-20' : 'translate-x-0',
          )}
          to={`${ROUTES.transactions}/${transaction.id}`}
          onTouchStart={(event) => {
            setTouchStartX(event.changedTouches[0]?.clientX ?? 0);
            setTouchStartY(event.changedTouches[0]?.clientY ?? 0);
          }}
          onTouchEnd={(event) => {
            if (touchStartX === null || touchStartY === null) {
              return;
            }

            const endX = event.changedTouches[0]?.clientX ?? 0;
            const endY = event.changedTouches[0]?.clientY ?? 0;
            const deltaX = endX - touchStartX;
            const deltaY = endY - touchStartY;

            if (deltaX < -68 && Math.abs(deltaY) < 32) {
              setSwipedTransactionId(transaction.id);
            } else if (deltaX > 68 && Math.abs(deltaY) < 32 && swipedTransactionId === transaction.id) {
              setSwipedTransactionId(null);
            }

            if (Math.abs(deltaX) > 24 && Math.abs(deltaY) < 24) {
              setSuppressClickId(transaction.id);
            }

            setTouchStartX(null);
            setTouchStartY(null);
          }}
          onClick={(event) => {
            if (suppressClickId === transaction.id) {
              event.preventDefault();
              setSuppressClickId(null);
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10">
              <span className="material-symbols-outlined text-[20px]">{transactionIcon(transaction.type)}</span>
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
            <p className={cn('text-sm font-extrabold', isIncome ? 'text-emerald-500' : 'text-rose-500')}>
              {isIncome ? '+' : '-'}
              {formatCurrency(amount)}
            </p>
            <p className="text-[10px] font-medium text-slate-400">{typeLabel(transaction)}</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28">
      <header className="space-y-3 pb-3">
        <MobileNativeHeader
          title={activeFilter === 'Hamısı' ? 'Əməliyyatlar' : `${activeFilter} Əməliyyatları`}
          backTo={ROUTES.dashboard}
          rightSlot={
            <button
              type="button"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                showFilters ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span className="material-symbols-outlined">{showFilters ? 'close' : 'filter_list'}</span>
            </button>
          }
        />

        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="w-full rounded-2xl border-none bg-slate-200/60 py-3 pl-10 pr-3 text-sm text-slate-700 outline-none ring-orange-200 placeholder:text-slate-500 focus:ring-2 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Əməliyyat axtar..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {showFilters && (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900"
              value={userFilter}
              onChange={(event) => {
                setUserFilter(event.target.value as 'all' | 'me' | 'partner');
                setPage(1);
              }}
            >
              <option value="all">İstifadəçi: Hamısı</option>
              <option value="me">İstifadəçi: Mən</option>
              <option value="partner">İstifadəçi: Digər</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative flex items-center h-10 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <span className="material-symbols-outlined ml-2.5 text-slate-400 text-sm">calendar_month</span>
                <input
                  className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPage(1);
                  }}
                />
                <span className="ml-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {fromDate ? formatDate(fromDate) : 'Başlanğıc'}
                </span>
              </div>
              <div className="relative flex items-center h-10 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <span className="material-symbols-outlined ml-2.5 text-slate-400 text-sm">event</span>
                <input
                  className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setPage(1);
                  }}
                />
                <span className="ml-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {toDate ? formatDate(toDate) : 'Son tarix'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
          {filterPills.map((pill) => (
            <button
              key={pill}
              className={cn(
                'h-9 shrink-0 rounded-full px-5 text-sm font-bold transition-all',
                activeFilter === pill
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
              type="button"
              onClick={() => setActiveFilter(pill)}
            >
              {pill}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-5 pt-1">
        {transactionsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-[70px] animate-pulse rounded-2xl bg-white/70 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : null}

        {transactionsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200">
            Əməliyyatları yükləmək mümkün olmadı. Yenidən cəhd edin.
          </div>
        ) : null}

        {!transactionsQuery.isLoading && !transactionsQuery.isError && groupedTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
            Bu filtrə uyğun əməliyyat tapılmadı.
          </div>
        ) : null}

        {!transactionsQuery.isLoading && !transactionsQuery.isError
          ? groupedTransactions.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.title}</h3>
                {group.subtitle ? <span className="text-[11px] font-medium text-slate-400">{group.subtitle}</span> : null}
              </div>
              <div className="space-y-2">{group.items.map(renderTransaction)}</div>
            </section>
          ))
          : null}

        {!transactionsQuery.isLoading && !transactionsQuery.isError ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/60">
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Geri
            </button>
            <span className="font-semibold text-slate-500">
              Səhifə {transactionsQuery.data?.meta?.page ?? page} / {transactionsQuery.data?.meta?.totalPages ?? 1}
            </span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
              onClick={() => setPage((current) => current + 1)}
              disabled={(transactionsQuery.data?.meta?.page ?? 1) >= (transactionsQuery.data?.meta?.totalPages ?? 1)}
            >
              İrəli
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
