import { TransactionForm } from '@/components/forms/transaction-form';

export function NewTransferPage() {
  return (
    <section className="mx-auto w-full max-w-md px-4 pb-28 pt-2">
      <TransactionForm
        type="transfer"
        title="Yeni transfer"
        description="Digər istifadəçiyə balans transferini qeyd et."
        submitLabel="Transferi yadda saxla"
      />
    </section>
  );
}
