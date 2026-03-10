import { TransactionForm } from '@/components/forms/transaction-form';

export function NewExpensePage() {
  return (
    <section className="mx-auto w-full max-w-md px-6 pb-32 pt-4">
      <TransactionForm
        type="expense"
        title="Yeni xərc"
        description="Kateqoriya, qeyd və zaman məlumatı ilə xərci qeyd et."
        submitLabel="Xərci yadda saxla"
      />
    </section>
  );
}
