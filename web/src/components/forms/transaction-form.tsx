import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES, type CreateTransactionRequest, type TransactionType } from '@shared/index';

import { MobileNativeHeader } from '@/components/layout/mobile-native-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';

type TransactionFormProps = {
  type: TransactionType;
  title: string;
  description: string;
  submitLabel: string;
};

function getNowLocalDateTime() {
  const now = new Date();
  const timezoneOffsetInMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetInMs).toISOString().slice(0, 16);
}

export function TransactionForm({ type, title, description, submitLabel }: TransactionFormProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [effectiveAt, setEffectiveAt] = useState(() => getNowLocalDateTime());
  const [categoryId, setCategoryId] = useState('');
  const [relatedUserId, setRelatedUserId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const usersQuery = useQuery({
    queryKey: ['transfer-users'],
    queryFn: () => api.getTransferUsers(),
    enabled: type === 'transfer',
  });

  const dashboardSummaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.getDashboardSummary(),
    enabled: type === 'transfer',
  });

  const visibleUsers = useMemo(
    () => (usersQuery.data?.items ?? []).filter((user) => user.role === 'user'),
    [usersQuery.data?.items],
  );

  const mutation = useMutation({
    mutationFn: async (payload: CreateTransactionRequest) => {
      if (type === 'transfer') {
        return api.createTransfer(payload);
      }

      return api.createTransaction(payload);
    },
    onSuccess: async () => {
      setMessage('Əməliyyat uğurla yaradıldı.');
      setErrorMessage(null);
      setIsSuccessModalOpen(true);
      setAmount('');
      setNote('');
      setEffectiveAt(getNowLocalDateTime());
      setCategoryId('');
      setRelatedUserId('');
      setReceiptFile(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);
    },
  });

  function handleSuccessOk() {
    setIsSuccessModalOpen(false);
    setMessage(null);
    navigate(ROUTES.dashboard);
  }

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => api.createCategory({ name }),
    onSuccess: async (response) => {
      setCategoryId(response.item.id);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(null);
    setErrorMessage(null);

    try {
      if (type === 'expense' && !categoryId) {
        setErrorMessage('Xərc üçün kateqoriya seçmək vacibdir.');
        return;
      }

      const payload: CreateTransactionRequest = {
        type,
        amount: Number(amount),
      };

      if (note) {
        payload.note = note;
      }

      if (type === 'expense' && categoryId) {
        payload.categoryId = categoryId;
      }

      if (type === 'transfer' && relatedUserId) {
        payload.relatedUserId = relatedUserId;
      }

      if (effectiveAt) {
        payload.effectiveAt = new Date(effectiveAt).toISOString();
      }

      await mutation.mutateAsync(payload);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Əməliyyat yaradılmadı.');
    }
  }

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }

    const nextPreview = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(nextPreview);

    return () => {
      URL.revokeObjectURL(nextPreview);
    };
  }, [receiptFile]);

  function categoryIconByName(name: string) {
    const normalized = name.toLowerCase();
    if (normalized.includes('qida') || normalized.includes('food')) return 'restaurant';
    if (normalized.includes('nəqliyyat') || normalized.includes('transport')) return 'directions_car';
    if (normalized.includes('alış') || normalized.includes('shop')) return 'shopping_bag';
    if (normalized.includes('sağlam') || normalized.includes('tibb')) return 'medical_services';
    if (normalized.includes('əylən') || normalized.includes('kino')) return 'confirmation_number';
    if (normalized.includes('kommunal') || normalized.includes('bill')) return 'receipt_long';
    if (normalized.includes('təhsil') || normalized.includes('edu')) return 'school';
    return 'grid_view';
  }

  if (type === 'expense') {
    const categories = categoriesQuery.data?.items ?? [];
    const featuredCategories = categories.slice(0, 7);

    return (
      <div className="mx-auto w-full max-w-md pb-40 pt-2">
        <MobileNativeHeader
          title="Məxaric"
          backTo={ROUTES.dashboard}
          rightSlot={<span className="material-symbols-outlined">shopping_cart</span>}
        />

        <form className="space-y-8 px-1" onSubmit={handleSubmit}>
          <div className="text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Məbləği daxil edin</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-light text-orange-600">₼</span>
              <input
                className="w-full max-w-[260px] border-none bg-transparent p-0 text-center text-6xl font-bold text-slate-900 outline-none [appearance:textfield] dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarix / saat</span>
            <input
              className="h-8 max-w-[172px] rounded-lg border border-slate-200 bg-transparent px-2 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 dark:border-slate-600 dark:text-slate-200"
              type="datetime-local"
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </div>

          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-xl font-bold tracking-tight">Kateqoriya</h2>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-orange-600 outline-none dark:border-slate-700 dark:bg-slate-800"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Hamısı</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {featuredCategories.map((category) => {
                const selected = categoryId === category.id;

                return (
                  <button
                    key={category.id}
                    className="group flex flex-col items-center gap-2"
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm transition-transform group-active:scale-95 dark:bg-slate-800 ${selected ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-slate-100 dark:border-slate-700'
                        }`}
                    >
                      <span className="material-symbols-outlined text-3xl text-orange-600">{categoryIconByName(category.name)}</span>
                    </div>
                    <span className="line-clamp-1 text-xs font-medium text-slate-600 dark:text-slate-400">{category.name}</span>
                  </button>
                );
              })}

              <button
                className="group flex flex-col items-center gap-2"
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-orange-300 bg-white shadow-sm transition-transform group-active:scale-95 dark:border-orange-500/50 dark:bg-slate-800">
                  <span className="material-symbols-outlined text-3xl text-orange-600">add</span>
                </div>
                <span className="line-clamp-1 text-xs font-medium text-slate-600 dark:text-slate-400">Yeni</span>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight">Qeyd (İstəyə bağlı)</h2>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <textarea
                className="min-h-[84px] w-full resize-none border-none bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-300"
                placeholder="Xərc haqqında qısa məlumat..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight">Şəkil əlavə et</h2>
            <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              />
              <div className="flex items-center justify-between gap-3">
                <span>{receiptFile ? receiptFile.name : 'Qəbz/şəkil seçmək üçün toxun'}</span>
                <span className="material-symbols-outlined text-orange-600">add_a_photo</span>
              </div>
            </label>
            {receiptPreviewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <img src={receiptPreviewUrl} alt="Seçilmiş şəkil" className="h-36 w-full object-cover" />
              </div>
            ) : null}
          </section>

          {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {errorMessage ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

          <div className="fixed inset-x-0 bottom-24 z-20 mx-auto w-[calc(100%-32px)] max-w-md">
            <Button className="h-14 w-full rounded-xl bg-orange-600 text-base font-bold hover:bg-orange-600/90" type="submit" disabled={mutation.isPending}>
              Təsdiqlə
            </Button>
          </div>
        </form>

        {isCategoryModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Yeni kateqoriya</h3>
                <button
                  className="flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none transition focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800"
                placeholder="Məsələn: Təhsil"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>
                  Ləğv et
                </Button>
                <Button
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  onClick={() => void createCategoryMutation.mutateAsync(newCategoryName.trim())}
                >
                  Yarat
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isSuccessModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                <span className="material-symbols-outlined">check</span>
              </div>
              <p className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Uğurlu oldu</p>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Əməliyyat uğurla tamamlandı.</p>
              <Button className="h-11 w-full" onClick={handleSuccessOk}>
                OK
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (type === 'income') {
    const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

    function appendAmountKey(key: string) {
      setAmount((current) => {
        if (key === '.') {
          if (!current) return '0.';
          if (current.includes('.')) return current;
          return `${current}.`;
        }

        const [rawIntegerPart, decimalPart] = current.split('.');
        const integerPart = rawIntegerPart ?? '';
        if (decimalPart && decimalPart.length >= 2) {
          return current;
        }

        if (current === '0') {
          return key;
        }

        if (integerPart.length >= 9 && !decimalPart) {
          return current;
        }

        return `${current}${key}`;
      });
    }

    function removeLastAmountKey() {
      setAmount((current) => current.slice(0, -1));
    }

    const canSubmit = Number(amount) > 0 && !mutation.isPending;

    return (
      <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-md flex-col pb-2 pt-1">
        <MobileNativeHeader
          title="Mədaxil"
          backTo={ROUTES.dashboard}
          rightSlot={<span className="material-symbols-outlined">payments</span>}
        />

        <form className="flex min-h-0 flex-1 flex-col px-1" onSubmit={handleSubmit}>
          <div className="py-3 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Məbləği daxil edin</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-light text-orange-600">₼</span>
              <input
                className="w-full max-w-[260px] border-none bg-transparent p-0 text-center text-6xl font-bold text-slate-900 outline-none [appearance:textfield] dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="mx-auto mb-4 flex items-center justify-center space-x-2 rounded-full bg-slate-100/80 px-4 py-1.5 shadow-sm dark:bg-slate-800/80">
            <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
            <input
              className="bg-transparent text-sm font-medium text-slate-600 outline-none dark:text-slate-300"
              type="datetime-local"
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </div>

          <input type="hidden" value={note} readOnly />
          <input
            className="sr-only"
            inputMode="decimal"
            min="0"
            required
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <div className="mt-2 pb-4">
            <div className="mb-4 grid grid-cols-3 gap-1.5">
              {keypadKeys.map((key) => (
                <button
                  key={key}
                  className="flex h-14 items-center justify-center rounded-2xl bg-white text-[26px] font-medium shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                  type="button"
                  onClick={() => appendAmountKey(key)}
                >
                  {key}
                </button>
              ))}

              <button
                className="flex h-14 items-center justify-center rounded-2xl bg-white text-[26px] font-medium shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                type="button"
                onClick={removeLastAmountKey}
              >
                <span className="material-symbols-outlined">backspace</span>
              </button>
            </div>

            {message ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
            {errorMessage ? <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

            <Button className="h-14 w-full rounded-xl bg-orange-600 text-base font-bold hover:bg-orange-600/90" disabled={!canSubmit} type="submit">
              Mədaxil et
            </Button>
          </div>
        </form>

        <div className="mx-auto mt-1 h-1.5 w-28 rounded-full bg-slate-300/90 dark:bg-slate-700" />

        {isSuccessModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                <span className="material-symbols-outlined">check</span>
              </div>
              <p className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Uğurlu oldu</p>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Əməliyyat uğurla tamamlandı.</p>
              <Button className="h-11 w-full" onClick={handleSuccessOk}>
                OK
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (type === 'transfer') {
    const selectedUser = visibleUsers.find((user) => user.id === relatedUserId);
    const transferUsersLoading = usersQuery.isLoading;
    const transferUsersError = usersQuery.error instanceof ApiError ? usersQuery.error.message : null;
    const myBalance = dashboardSummaryQuery.data?.myBalance;

    return (
      <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-md flex-col pb-28 pt-1">
        <MobileNativeHeader
          title="Köçürmə"
          backTo={ROUTES.dashboard}
          rightSlot={
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/20">
              {typeof myBalance === 'number' ? `₼${myBalance.toFixed(2)}` : '₼0.00'}
            </span>
          }
        />

        <form className="flex min-h-0 flex-1 flex-col space-y-4 px-1 pt-2" onSubmit={handleSubmit}>
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Məbləği daxil edin</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-light text-orange-600">₼</span>
              <input
                className="w-full max-w-[260px] border-none bg-transparent p-0 text-center text-6xl font-bold text-slate-900 outline-none [appearance:textfield] dark:text-slate-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarix</span>
            <input
              className="h-9 max-w-[172px] rounded-xl border border-slate-200 bg-transparent px-2 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 dark:border-slate-700 dark:text-slate-200"
              type="datetime-local"
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Kimə</h2>
            <label className="group block cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-500/20">
                    <span className="material-symbols-outlined text-slate-500">person_outline</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{selectedUser ? selectedUser.username : 'İstifadəçi seçin'}</span>
                    <span className="text-xs text-slate-400">Ailə üzvləri və ya dostlar</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-orange-600">expand_more</span>
              </div>

              <div className="relative mt-2">
                <p className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm leading-[44px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {transferUsersLoading ? 'İstifadəçilər yüklənir...' : visibleUsers.length === 0 ? 'Aktiv user tapılmadı' : selectedUser ? selectedUser.username : 'İstifadəçi seçin'}
                </p>
                <select
                  className="absolute inset-0 h-11 w-full cursor-pointer opacity-0"
                  required
                  value={relatedUserId}
                  onChange={(event) => setRelatedUserId(event.target.value)}
                  disabled={transferUsersLoading || visibleUsers.length === 0}
                >
                  <option value="">User seç</option>
                  {visibleUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              {transferUsersError ? (
                <p className="mt-2 text-xs font-medium text-rose-600">{transferUsersError}</p>
              ) : null}
            </label>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Qeyd</p>
            <label className="block space-y-1">
              <textarea
                className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800"
                placeholder="Əlavə qeyd yaz..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>

          {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {errorMessage ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

          <div className="fixed inset-x-0 bottom-24 z-20 mx-auto w-[calc(100%-32px)] max-w-md">
            <Button
              className="h-14 w-full rounded-2xl bg-orange-600 text-base font-bold text-white shadow-lg shadow-orange-600/20 hover:bg-orange-600/90"
              type="submit"
              disabled={mutation.isPending || transferUsersLoading || visibleUsers.length === 0}
            >
              Balansdan köçür
            </Button>
          </div>
        </form>

        {isSuccessModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
                <span className="material-symbols-outlined">check</span>
              </div>
              <p className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Uğurlu oldu</p>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Əməliyyat uğurla tamamlandı.</p>
              <Button className="h-11 w-full" onClick={handleSuccessOk}>
                OK
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Məbləğ</span>
            <input
              className="h-12 w-full rounded-[20px] border border-border bg-white px-4 outline-none transition focus:border-accent"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Tarix / saat</span>
            <input
              className="h-12 w-full rounded-[20px] border border-border bg-white px-4 outline-none transition focus:border-accent"
              type="datetime-local"
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </label>

          {type === 'transfer' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-text">Alan user</span>
              <select
                className="h-12 w-full rounded-[20px] border border-border bg-white px-4 outline-none transition focus:border-accent"
                required
                value={relatedUserId}
                onChange={(event) => setRelatedUserId(event.target.value)}
              >
                <option value="">User seç</option>
                {visibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Qeyd</span>
            <textarea
              className="min-h-[108px] w-full rounded-[20px] border border-border bg-white px-4 py-3 outline-none transition focus:border-accent"
              placeholder="Əlavə qeyd yaz..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <div className="rounded-[22px] border border-dashed border-border bg-white/70 px-4 py-4 text-sm text-muted">
            <p className="font-medium text-text">Receipt upload placeholder</p>
            <p className="mt-1">Hazırkı mərhələdə UI səviyyəsində yalnız yer ayrılıb; real upload backend və compression axını növbəti mərhələdə tamamlanacaq.</p>
            <input className="mt-3 block w-full text-sm text-muted" type="file" accept="image/*" disabled />
          </div>

          {message ? <div className="rounded-[20px] bg-[#eef8f1] px-4 py-3 text-sm text-[#23734a]">{message}</div> : null}
          {errorMessage ? <div className="rounded-[20px] bg-[#fff4f4] px-4 py-3 text-sm text-[#a63939]">{errorMessage}</div> : null}

          <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
            {submitLabel}
          </Button>
        </form>
      </CardContent>

      {isSuccessModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
              <span className="material-symbols-outlined">check</span>
            </div>
            <p className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Uğurlu oldu</p>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Əməliyyat uğurla tamamlandı.</p>
            <Button className="h-11 w-full" onClick={handleSuccessOk}>
              OK
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
