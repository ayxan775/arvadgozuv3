import { TransactionForm } from '@/components/forms/transaction-form';

export function NewIncomePage() {
  return (
    <section className="mx-auto w-full max-w-md px-4 pb-28 pt-2">
      <TransactionForm
        type="income"
        title="Yeni gəlir"
        description="Kurs gəliri və digər daxilolmaları sürətli şəkildə daxil et."
        submitLabel="Gəliri yadda saxla"
      />
    </section>
  );
}
