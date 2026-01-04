'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface AccountOption {
  code: string;
  name: string;
}

interface TaxRateOption {
  id: string;
  name: string;
}

interface FormState {
  sku: string;
  name: string;
  description: string;
  unitPrice: string;
  incomeAccountCode: string;
  taxRateId: string;
}

export function NewProductForm({
  accounts,
  taxRates
}: {
  accounts: AccountOption[];
  taxRates: TaxRateOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState: FormState = {
    sku: '',
    name: '',
    description: '',
    unitPrice: '',
    incomeAccountCode: accounts[0]?.code ?? '',
    taxRateId: taxRates[0]?.id ?? ''
  };

  const [form, setForm] = useState<FormState>(initialState);

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.sku.trim()) {
      setError('SKU is required');
      return;
    }

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    const unitPriceNumber = Number(form.unitPrice.replace(',', '.'));
    if (!Number.isFinite(unitPriceNumber) || unitPriceNumber < 0) {
      setError('Unit price must be zero or a positive number');
      return;
    }

    const unitPriceNet = Math.round(unitPriceNumber * 100);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku: form.sku.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          unitPriceNet,
          incomeAccountCode: form.incomeAccountCode,
          taxRateId: form.taxRateId || undefined
        })
      });

      if (!response.ok) {
        let message = 'Failed to create product';
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
      console.error('Failed to submit product form', networkError);
      setError('Unable to reach the API. Please try again.');
      return;
    }

    setForm(initialState);
    startTransition(() => {
      router.refresh();
    });
  }

  if (accounts.length === 0) {
    return <p>Add at least one income account before creating products.</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        <span>SKU</span>
        <input
          type="text"
          value={form.sku}
          onChange={(event) => updateField('sku', event.target.value)}
          placeholder="SKU-001"
          required
        />
      </label>
      <label>
        <span>Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Service package"
          required
        />
      </label>
      <label>
        <span>Description</span>
        <input
          type="text"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="Optional description"
        />
      </label>
      <label>
        <span>Unit price (DKK)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.unitPrice}
          onChange={(event) => updateField('unitPrice', event.target.value)}
          placeholder="0.00"
          required
        />
      </label>
      <label>
        <span>Income account</span>
        <select
          value={form.incomeAccountCode}
          onChange={(event) => updateField('incomeAccountCode', event.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.code} value={account.code}>
              {account.code} – {account.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tax rate</span>
        <select value={form.taxRateId} onChange={(event) => updateField('taxRateId', event.target.value)}>
          <option value="">No tax</option>
          {taxRates.map((taxRate) => (
            <option key={taxRate.id} value={taxRate.id}>
              {taxRate.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Create product'}
      </button>
    </form>
  );
}
