'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatDKK } from '../lib/money';

interface InvoiceOption {
  id: string;
  invoiceNo: string;
  balance: number;
}

interface BillOption {
  id: string;
  billNo: string;
  balance: number;
}

type PaymentType = 'AR' | 'AP';

interface FormState {
  type: PaymentType;
  invoiceId: string;
  billId: string;
  amount: string;
  date: string;
  reference: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function RecordPaymentForm({
  invoices,
  bills
}: {
  invoices: InvoiceOption[];
  bills: BillOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo<FormState>(() => {
    const today = new Date();
    return {
      type: invoices.length > 0 ? 'AR' : 'AP',
      invoiceId: invoices[0]?.id ?? '',
      billId: bills[0]?.id ?? '',
      amount: '',
      date: toDateInputValue(today),
      reference: ''
    };
  }, [invoices, bills]);

  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    if (invoices.length === 0) {
      setForm((current) => ({ ...current, invoiceId: '' }));
      return;
    }

    const hasInvoice = invoices.some((invoice) => invoice.id === form.invoiceId);
    if (!hasInvoice) {
      setForm((current) => ({ ...current, invoiceId: invoices[0]?.id ?? '' }));
    }
  }, [invoices, form.invoiceId]);

  useEffect(() => {
    if (bills.length === 0) {
      setForm((current) => ({ ...current, billId: '' }));
      return;
    }

    const hasBill = bills.some((bill) => bill.id === form.billId);
    if (!hasBill) {
      setForm((current) => ({ ...current, billId: bills[0]?.id ?? '' }));
    }
  }, [bills, form.billId]);

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.type === 'AR' && invoices.length === 0) {
      setError('There are no open invoices to pay.');
      return;
    }

    if (form.type === 'AP' && bills.length === 0) {
      setError('There are no open bills to pay.');
      return;
    }

    const amountNumber = Number(form.amount.replace(',', '.'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    const amount = Math.round(amountNumber * 100);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: form.type,
          amount,
          date: form.date,
          reference: form.reference.trim() || undefined,
          invoiceId: form.type === 'AR' ? form.invoiceId : undefined,
          billId: form.type === 'AP' ? form.billId : undefined,
          method: 'BANK_TRANSFER'
        })
      });

      if (!response.ok) {
        let message = 'Failed to record payment';
        try {
          const body = await response.json();
          message = body?.error?.message ?? message;
        } catch (parseError) {
          console.error('Failed to parse error response', parseError);
        }
        setError(message);
        return;
      }
    } catch (networkError) {
      console.error('Failed to submit payment form', networkError);
      setError('Unable to reach the API. Please try again.');
      return;
    }

    setForm({ ...initialState, type: form.type });
    startTransition(() => {
      router.refresh();
    });
  }

  const currentOptions = form.type === 'AR' ? invoices : bills;
  const showEmptyState = currentOptions.length === 0;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        <span>Payment type</span>
        <select value={form.type} onChange={(event) => updateField('type', event.target.value as PaymentType)}>
          <option value="AR">Customer payment (AR)</option>
          <option value="AP">Vendor payment (AP)</option>
        </select>
      </label>
      {form.type === 'AR' ? (
        <label>
          <span>Invoice</span>
          {invoices.length === 0 ? (
            <p>No open invoices.</p>
          ) : (
            <select
              value={form.invoiceId}
              onChange={(event) => updateField('invoiceId', event.target.value)}
              required
            >
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNo} — balance {formatDKK(invoice.balance)}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : (
        <label>
          <span>Bill</span>
          {bills.length === 0 ? (
            <p>No open bills.</p>
          ) : (
            <select
              value={form.billId}
              onChange={(event) => updateField('billId', event.target.value)}
              required
            >
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNo} — balance {formatDKK(bill.balance)}
                </option>
              ))}
            </select>
          )}
        </label>
      )}
      <label>
        <span>Amount (DKK)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(event) => updateField('amount', event.target.value)}
          placeholder="0.00"
          required
        />
      </label>
      <label>
        <span>Payment date</span>
        <input
          type="date"
          value={form.date}
          onChange={(event) => updateField('date', event.target.value)}
          required
        />
      </label>
      <label>
        <span>Reference</span>
        <input
          type="text"
          value={form.reference}
          onChange={(event) => updateField('reference', event.target.value)}
          placeholder="Optional reference"
        />
      </label>
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <button type="submit" disabled={isPending || showEmptyState}>
        {isPending ? 'Recording…' : 'Record payment'}
      </button>
    </form>
  );
}
