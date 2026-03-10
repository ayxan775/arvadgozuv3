import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ROUTES, type TransactionItem, type UpdateTransactionRequest } from '@shared/index';
import { api, ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const timeFormatter = new Intl.DateTimeFormat('az-AZ', {
  hour: '2-digit',
  minute: '2-digit',
});

function transactionIcon(type: TransactionItem['type']) {
  if (type === 'income') return 'payments';
  if (type === 'transfer') return 'swap_horiz';
  return 'shopping_bag';
}

function transactionSign(type: TransactionItem['type']) {
  return type === 'income' ? '+' : '-';
}

function transactionStatusLabel(status: TransactionItem['status']) {
  if (status === 'pending') return 'Gözləmədə';
  if (status === 'failed') return 'Uğursuz';
  if (status === 'syncing') return 'Sinxronizasiya';
  return 'Uğurlu';
}

function transactionStatusColor(status: TransactionItem['status']) {
  if (status === 'pending') return 'bg-amber-500';
  if (status === 'failed') return 'bg-rose-500';
  if (status === 'syncing') return 'bg-blue-500';
  return 'bg-emerald-500';
}

export function TransactionDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions(),
  });

  const transaction = useMemo<TransactionItem | undefined>(
    () => transactionsQuery.data?.items.find((item) => item.id === id),
    [id, transactionsQuery.data?.items],
  );

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Transaction id is missing.');
      }

      const payload: UpdateTransactionRequest = {};

      if (amount) {
        payload.amount = Number(amount);
      }

      if (note) {
        payload.note = note;
      }

      return api.updateTransaction(id, payload);
    },
    onSuccess: async () => {
      setMessage('Əməliyyat yeniləndi.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Transaction id is missing.');
      }

      return api.deleteTransaction(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);
      navigate(ROUTES.transactions);
    },
  });

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!amount && !note) {
      setErrorMessage('Yeniləmək üçün ən az bir sahə daxil edin.');
      return;
    }

    try {
      await updateMutation.mutateAsync();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Yeniləmə alınmadı.');
    }
  }

  async function handleShareReceipt() {
    if (!transaction) {
      return;
    }

    const createdAtLabel = transaction.createdAt ? formatDate(transaction.createdAt) : 'Tarix yoxdur';
    const shareText = `Əməliyyat qəbzi\nMəbləğ: ${transactionSign(transaction.type)}${formatCurrency(
      Math.abs(transaction.amount),
    )}\nStatus: ${transactionStatusLabel(transaction.status)}\nTarix: ${createdAtLabel}\nQeyd: ${transaction.note ?? 'Yoxdur'}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Əməliyyat qəbzi',
          text: shareText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setMessage('Qəbz mətni kopyalandı.');
      } else {
        setErrorMessage('Bu cihazda paylaşma dəstəklənmir.');
      }
    } catch {
      setErrorMessage('Paylaşma tamamlanmadı.');
    }
  }

  if (!transaction && !transactionsQuery.isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Əməliyyat tapılmadı</p>
          <p className="mt-1 text-sm text-slate-500">Bu əməliyyat mövcud deyil və ya silinib.</p>
          <button
            type="button"
            className="mt-4 h-11 w-full rounded-2xl bg-orange-500 text-sm font-bold text-white"
            onClick={() => navigate(ROUTES.transactions)}
          >
            Əməliyyatlara qayıt
          </button>
        </div>
      </main>
    );
  }

  const createdAt = transaction?.effectiveAt ?? transaction?.createdAt;
  const createdAtLabel = createdAt ? formatDate(createdAt) : 'Tarix yoxdur';
  const createdAtTime = createdAt ? timeFormatter.format(new Date(createdAt)) : '--:--';
  const categoryName =
    transaction?.categoryId && categoriesQuery.data
      ? categoriesQuery.data.items.find((item) => item.id === transaction.categoryId)?.name
      : null;
  const recipientName = transaction
    ? transaction.counterparty ??
    (transaction.actorUserId === session.userId ? summaryQuery.data?.partnerUsername : summaryQuery.data?.myUsername) ??
    'Digər istifadəçi'
    : '-';

  return (
    <main className="bg-slate-200 dark:bg-slate-900 font-display">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-[#f8f6f6] dark:bg-[#221610]">
        <div className="pointer-events-none p-6 opacity-30 grayscale">
          <div className="mb-8 flex items-center justify-between">
            <div className="h-8 w-8 rounded-full bg-orange-500/20" />
            <div className="h-6 w-24 rounded-lg bg-slate-300 dark:bg-slate-700" />
            <div className="h-8 w-8 rounded-full bg-orange-500/20" />
          </div>
          <div className="space-y-4">
            <div className="h-28 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
            <div className="h-12 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
            <div className="h-12 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
            <div className="h-12 w-full rounded-xl bg-slate-300 dark:bg-slate-700" />
          </div>
        </div>

        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40">
          <section className="flex max-h-[92vh] flex-col overflow-hidden rounded-t-[2.5rem] bg-[#f8f6f6] shadow-2xl dark:bg-[#221610]">
            <button
              className="flex h-8 w-full items-center justify-center pt-2"
              type="button"
              onClick={() => navigate(ROUTES.transactions)}
            >
              <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
            </button>

            {transactionsQuery.isLoading || !transaction ? (
              <div className="space-y-3 px-6 pb-10 pt-4">
                <div className="h-8 w-2/5 animate-pulse rounded-lg bg-slate-300/80 dark:bg-slate-700/80" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-300/70 dark:bg-slate-700/70" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-300/70 dark:bg-slate-700/70" />
              </div>
            ) : (
              <>
                <div className="px-6 pb-6 pt-3 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                    <span className="material-symbols-outlined text-4xl">{transactionIcon(transaction.type)}</span>
                  </div>
                  <h1 className="text-[40px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                    {transactionSign(transaction.type)}{formatCurrency(Math.abs(transaction.amount))}
                  </h1>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span className={`size-2 rounded-full ${transactionStatusColor(transaction.status)}`} />
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {transactionStatusLabel(transaction.status)}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto px-6 pb-2">
                  <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800/50">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight text-slate-400 dark:text-slate-500">Recipient</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{recipientName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800/50">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      <span className="material-symbols-outlined">calendar_today</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight text-slate-400 dark:text-slate-500">Date & Time</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{createdAtLabel}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{createdAtTime}</p>
                  </div>

                  <div className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800/50">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      <span className="material-symbols-outlined">category</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight text-slate-400 dark:text-slate-500">Category</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{categoryName ?? transaction.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-4">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      <span className="material-symbols-outlined">notes</span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <p className="text-xs font-semibold uppercase tracking-tight text-slate-400 dark:text-slate-500">Qeyd</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{transaction.note ?? 'Qeyd yoxdur'}</p>
                    </div>
                  </div>

                  <form className="space-y-3 border-t border-slate-100 pb-3 pt-4 dark:border-slate-800/50" onSubmit={handleUpdate}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Redaktə et</p>
                    <input
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-orange-200 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={`Yeni məbləğ (cari: ${transaction.amount})`}
                      step="0.01"
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                    <textarea
                      className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-orange-200 placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder={transaction.note ?? 'Yeni qeyd daxil et'}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="h-10 flex-1 rounded-xl bg-emerald-500 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {updateMutation.isPending ? 'Yadda saxlanır...' : 'Yadda saxla'}
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => void deleteMutation.mutateAsync()}
                        className="h-10 flex-1 rounded-xl bg-rose-500 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? 'Silinir...' : 'Sil'}
                      </button>
                    </div>
                  </form>

                  {message ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{message}</div> : null}
                  {errorMessage ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{errorMessage}</div> : null}
                </div>

                <footer className="border-t border-slate-100 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-800/20">
                  <button
                    type="button"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/20 transition-transform active:scale-95"
                    onClick={() => void handleShareReceipt()}
                  >
                    <span className="material-symbols-outlined">share</span>
                    Share Receipt
                  </button>
                  <button
                    type="button"
                    className="mt-3 h-12 w-full text-base font-semibold text-slate-500 dark:text-slate-400"
                    onClick={() => setErrorMessage('Problem barədə dəstəyə məlumat verə bilərsiniz.')}
                  >
                    Report an Issue
                  </button>
                </footer>
                <div className="h-8" />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
