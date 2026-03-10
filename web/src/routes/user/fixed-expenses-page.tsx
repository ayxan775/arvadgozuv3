import { type FormEvent, useMemo, useState } from 'react';

import { ROUTES, type CreateFixedExpenseRequest, type UpdateFixedExpenseRequest } from '@shared/index';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { ApiError, api } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export function FixedExpensesPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingBaseAmount, setEditingBaseAmount] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingNote, setEditingNote] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fixedExpensesQuery = useQuery({
    queryKey: ['fixed-expenses'],
    queryFn: () => api.getFixedExpenses(),
    staleTime: 15_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    staleTime: 60_000,
  });

  const categoryMap = useMemo(
    () => new Map((categoriesQuery.data?.items ?? []).map((item) => [item.id, item.name])),
    [categoriesQuery.data?.items],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateFixedExpenseRequest) => api.createFixedExpense(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] });
      setTitle('');
      setBaseAmount('');
      setCategoryId('');
      setNote('');
      setShowAddForm(false);
      setActionMessage('Sabit xərc əlavə edildi.');
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.payFixedExpense(id),
    onMutate: (id) => {
      setPayingId(id);
      setActionMessage(null);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);

      setActionMessage(
        `${formatCurrency(result.item.paidAmount)} ödəndi və əməliyyatlar bölməsinə əlavə olundu.`,
      );
    },
    onSettled: () => {
      setPayingId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFixedExpenseRequest }) => api.updateFixedExpense(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] });
      setEditingId(null);
      setEditingTitle('');
      setEditingBaseAmount('');
      setEditingCategoryId('');
      setEditingNote('');
      setActionMessage('Sabit xərc yeniləndi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFixedExpense(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] });
      setEditingId(null);
      setActionMessage('Sabit xərc silindi.');
    },
  });

  const summary = fixedExpensesQuery.data?.summary ?? {
    month: '',
    totalCount: 0,
    paidCount: 0,
    totalBase: 0,
    totalPaid: 0,
    totalDue: 0,
  };

  const createError = createMutation.error instanceof ApiError ? createMutation.error.message : null;
  const listError = fixedExpensesQuery.error instanceof ApiError ? fixedExpensesQuery.error.message : null;
  const payError = payMutation.error instanceof ApiError ? payMutation.error.message : null;
  const updateError = updateMutation.error instanceof ApiError ? updateMutation.error.message : null;
  const deleteError = deleteMutation.error instanceof ApiError ? deleteMutation.error.message : null;

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);

    const normalizedAmount = Number(baseAmount.replace(',', '.'));

    if (!title.trim() || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setActionMessage('Ad və düzgün aylıq məbləğ daxil edin.');
      return;
    }

    const payload: CreateFixedExpenseRequest = {
      title: title.trim(),
      baseAmount: normalizedAmount,
    };

    if (note.trim()) {
      payload.note = note.trim();
    }

    if (categoryId) {
      payload.categoryId = categoryId;
    }

    await createMutation.mutateAsync(payload);
  }

  function startEditing(item: {
    id: string;
    title: string;
    baseAmount: number;
    categoryId?: string | undefined;
    note?: string | undefined;
  }) {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingBaseAmount(String(item.baseAmount));
    setEditingCategoryId(item.categoryId ?? '');
    setEditingNote(item.note ?? '');
    setActionMessage(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle('');
    setEditingBaseAmount('');
    setEditingCategoryId('');
    setEditingNote('');
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const normalizedAmount = Number(editingBaseAmount.replace(',', '.'));

    if (!editingTitle.trim() || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setActionMessage('Ad və düzgün aylıq məbləğ daxil edin.');
      return;
    }

    const payload: UpdateFixedExpenseRequest = {
      title: editingTitle.trim(),
      baseAmount: normalizedAmount,
      categoryId: editingCategoryId,
      note: editingNote,
    };

    await updateMutation.mutateAsync({ id: editingId, payload });
  }

  async function handleDeleteFixedExpense(id: string) {
    const shouldDelete = window.confirm('Bu sabit xərc silinsin?');

    if (!shouldDelete) {
      return;
    }

    setActionMessage(null);
    await deleteMutation.mutateAsync(id);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28">
      <header className="space-y-3 pb-3">
        <MobileNativeHeader
          title="Sabit xərclər"
          backTo={ROUTES.dashboard}
          rightSlot={
            <button
              type="button"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                showAddForm
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
              onClick={() => setShowAddForm((previous) => !previous)}
              aria-label={showAddForm ? 'Formu bağla' : 'Sabit xərc əlavə et'}
            >
              <span className="material-symbols-outlined">{showAddForm ? 'close' : 'add'}</span>
            </button>
          }
        />

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold text-slate-500">Ödənib</p>
            <p className="mt-1 text-sm font-extrabold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold text-slate-500">Qalıb</p>
            <p className="mt-1 text-sm font-extrabold text-rose-600">{formatCurrency(summary.totalDue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold text-slate-500">Status</p>
            <p className="mt-1 text-sm font-extrabold text-slate-700 dark:text-slate-100">
              {summary.paidCount}/{summary.totalCount}
            </p>
          </div>
        </div>

        {actionMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/20 dark:text-emerald-300">
            {actionMessage}
          </div>
        ) : null}

        {createError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {createError}
          </div>
        ) : null}

        {payError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {payError}
          </div>
        ) : null}

        {updateError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {updateError}
          </div>
        ) : null}

        {deleteError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {deleteError}
          </div>
        ) : null}

        {showAddForm ? (
          <form
            className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
            onSubmit={(event) => void handleCreateSubmit(event)}
          >
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Xərc adı (məs: İnternet)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                type="number"
                min="0"
                step="0.01"
                placeholder="Aylıq məbləğ"
                value={baseAmount}
                onChange={(event) => setBaseAmount(event.target.value)}
              />
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Kateqoriya (seçimsiz)</option>
                {(categoriesQuery.data?.items ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Qeyd (opsional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              className="h-10 w-full rounded-xl bg-orange-500 text-sm font-bold text-white transition disabled:opacity-60"
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Əlavə olunur...' : 'Sabit xərc əlavə et'}
            </button>
          </form>
        ) : null}
      </header>

      <div className="space-y-2">
        {fixedExpensesQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/70 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : null}

        {listError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {listError}
          </div>
        ) : null}

        {!fixedExpensesQuery.isLoading &&
          !listError &&
          (fixedExpensesQuery.data?.items.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
            Sabit xərc yoxdur. Yuxarıdakı “+” ilə əlavə edin.
          </div>
        ) : null}

        {(fixedExpensesQuery.data?.items ?? []).map((item) => {
          const isPaid = item.dueAmount <= 0;
          const hasDelay = item.unpaidMonths > 1;
          const categoryName = item.categoryId ? categoryMap.get(item.categoryId) : null;
          const isEditing = editingId === item.id;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
            >
              {isEditing ? (
                <form className="space-y-2" onSubmit={(event) => void handleEditSubmit(event)}>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    placeholder="Xərc adı"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingBaseAmount}
                      onChange={(event) => setEditingBaseAmount(event.target.value)}
                      placeholder="Aylıq məbləğ"
                    />
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                      value={editingCategoryId}
                      onChange={(event) => setEditingCategoryId(event.target.value)}
                    >
                      <option value="">Kateqoriya (seçimsiz)</option>
                      {(categoriesQuery.data?.items ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-orange-200 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={editingNote}
                    onChange={(event) => setEditingNote(event.target.value)}
                    placeholder="Qeyd"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="submit"
                      className="h-9 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white transition disabled:opacity-60"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? '...' : 'Yadda saxla'}
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-xl bg-slate-500 px-3 text-xs font-bold text-white transition"
                      onClick={cancelEditing}
                    >
                      Ləğv et
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-xl bg-rose-500 px-3 text-xs font-bold text-white transition disabled:opacity-60"
                      onClick={() => void handleDeleteFixedExpense(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? '...' : 'Sil'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {categoryName ? `Kateqoriya: ${categoryName}` : 'Kateqoriya seçilməyib'}
                      </p>
                      {item.note ? (
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{item.note}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-9 rounded-xl bg-slate-500 px-3 text-xs font-bold text-white transition"
                        onClick={() =>
                          startEditing({
                            id: item.id,
                            title: item.title,
                            baseAmount: item.baseAmount,
                            categoryId: item.categoryId,
                            note: item.note,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'h-9 rounded-xl px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60',
                          isPaid ? 'bg-emerald-500' : 'bg-orange-500',
                        )}
                        onClick={() => void payMutation.mutateAsync(item.id)}
                        disabled={isPaid || payMutation.isPending}
                      >
                        {payMutation.isPending && payingId === item.id ? '...' : isPaid ? 'Ödənib' : 'Ödə'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-100/80 px-2.5 py-2 dark:bg-slate-800/80">
                      <p className="text-[10px] font-semibold text-slate-500">Aylıq baza</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-100">{formatCurrency(item.baseAmount)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100/80 px-2.5 py-2 dark:bg-slate-800/80">
                      <p className="text-[10px] font-semibold text-slate-500">Cari ödəniş</p>
                      <p className={cn('text-xs font-bold', isPaid ? 'text-emerald-600' : 'text-rose-600')}>
                        {formatCurrency(item.dueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    <span>
                      {hasDelay
                        ? `${item.unpaidMonths} ay yığılıb (növbəti ay avtomatik 2x olur).`
                        : isPaid
                          ? 'Bu ay üçün ödəniş tamamlanıb.'
                          : 'Bu ay ödənməlidir.'}
                    </span>
                    <span>{item.updatedAt ? formatDate(item.updatedAt) : ''}</span>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
