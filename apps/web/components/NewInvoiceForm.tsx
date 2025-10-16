'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatDKK } from '../lib/money';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

interface CustomerOption {
  id: string;
  name: string;
}

interface FormState {
  customerId: string;
  issueDate: string;
  dueDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function defaultDueDate(issueDate: Date): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + 14);
  return due;
}

export function NewInvoiceForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo<FormState>(() => {
    const today = new Date();
    const firstCustomerId = customers[0]?.id ?? '';
    return {
      customerId: firstCustomerId,
      issueDate: toDateInputValue(today),
      dueDate: toDateInputValue(defaultDueDate(today)),
      description: '',
      quantity: '1',
      unitPrice: ''
    };
  }, [customers]);

  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    if (customers.length === 0) {
      setForm((current) => ({ ...current, customerId: '' }));
      return;
    }

    const hasCustomer = customers.some((customer) => customer.id === form.customerId);
    if (!hasCustomer) {
      setForm((current) => ({ ...current, customerId: customers[0]?.id ?? '' }));
    }
  }, [customers, form.customerId]);

  const quantityNumber = Number(form.quantity.replace(',', '.'));
  const unitPriceNumber = Number(form.unitPrice.replace(',', '.'));
  const totalOre = Number.isFinite(quantityNumber) && Number.isFinite(unitPriceNumber)
    ? Math.round(quantityNumber * unitPriceNumber * 100)
    : null;

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (customers.length === 0) {
      setError('Add a customer before creating an invoice.');
      return;
    }

    if (!form.customerId) {
      setError('Select a customer');
      return;
    }

    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }

    const quantity = Number(form.quantity.replace(',', '.'));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    const unitPrice = Number(form.unitPrice.replace(',', '.'));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setError('Unit price must be a positive number');
      return;
    }

    const unitPriceNet = Math.round(unitPrice * 100);

    const response = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId: form.customerId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        currency: 'DKK',
        lines: [
          {
            description: form.description.trim(),
            quantity,
            unitPriceNet
          }
        ]
      })
    });

    if (!response.ok) {
      let message = 'Failed to create invoice';
      try {
        const body = await response.json();
        message = body?.error?.message ?? message;
      } catch (parseError) {
        console.error('Failed to parse error response', parseError);
      }
      setError(message);
      return;
    }

    setForm({ ...initialState });
    startTransition(() => {
      router.refresh();
    });
  }

  if (customers.length === 0) {
    return <p>Create a customer before issuing an invoice.</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        <span>Customer</span>
        <select
          value={form.customerId}
          onChange={(event) => updateField('customerId', event.target.value)}
          required
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Issue date</span>
        <input
          type="date"
          value={form.issueDate}
          onChange={(event) => updateField('issueDate', event.target.value)}
          required
        />
      </label>
      <label>
        <span>Due date</span>
        <input
          type="date"
          value={form.dueDate}
          onChange={(event) => updateField('dueDate', event.target.value)}
          required
        />
      </label>
      <label>
        <span>Description</span>
        <input
          type="text"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="Consulting services"
          required
        />
      </label>
      <label>
        <span>Quantity</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.quantity}
          onChange={(event) => updateField('quantity', event.target.value)}
          required
        />
      </label>
      <label>
        <span>Unit price (DKK)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.unitPrice}
          onChange={(event) => updateField('unitPrice', event.target.value)}
          placeholder="0.00"
          required
        />
      </label>
      {totalOre !== null ? <p>Invoice total: {formatDKK(totalOre)}</p> : null}
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create invoice'}
      </button>
    </form>
  );
}
