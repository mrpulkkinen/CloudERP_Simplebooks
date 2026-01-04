'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatDKK } from '../lib/money';

interface VendorOption {
  id: string;
  name: string;
}

interface TaxRateOption {
  id: string;
  name: string;
}

interface AccountOption {
  code: string;
  name: string;
}

interface LineState {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRateId: string;
  accountCode: string;
}

interface FormState {
  vendorId: string;
  issueDate: string;
  dueDate: string;
  lines: LineState[];
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function defaultDueDate(issueDate: Date): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + 14);
  return due;
}

export function NewBillForm({
  vendors,
  taxRates,
  accounts
}: {
  vendors: VendorOption[];
  taxRates: TaxRateOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo<FormState>(() => {
    const today = new Date();
    const firstVendorId = vendors[0]?.id ?? '';
    const defaultTaxRate = taxRates[0]?.id ?? '';
    const defaultAccountCode = accounts[0]?.code ?? '';
    return {
      vendorId: firstVendorId,
      issueDate: toDateInputValue(today),
      dueDate: toDateInputValue(defaultDueDate(today)),
      lines: [
        {
          id: 0,
          description: '',
          quantity: '1',
          unitPrice: '',
          taxRateId: defaultTaxRate,
          accountCode: defaultAccountCode
        }
      ]
    };
  }, [vendors, taxRates, accounts]);

  const [form, setForm] = useState<FormState>(initialState);
  const [lineCounter, setLineCounter] = useState(1);

  useEffect(() => {
    if (vendors.length === 0) {
      setForm((current) => ({ ...current, vendorId: '' }));
      return;
    }

    const hasVendor = vendors.some((vendor) => vendor.id === form.vendorId);
    if (!hasVendor) {
      setForm((current) => ({ ...current, vendorId: vendors[0]?.id ?? '' }));
    }
  }, [vendors, form.vendorId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => {
        const hasTaxRate = line.taxRateId ? taxRates.some((rate) => rate.id === line.taxRateId) : false;
        const hasAccount = line.accountCode ? accounts.some((acct) => acct.code === line.accountCode) : false;
        return {
          ...line,
          taxRateId: hasTaxRate ? line.taxRateId : taxRates[0]?.id ?? '',
          accountCode: hasAccount ? line.accountCode : accounts[0]?.code ?? ''
        };
      })
    }));
  }, [taxRates, accounts]);

  const totalOre = form.lines.reduce((sum, line) => {
    const quantityNumber = Number(line.quantity.replace(',', '.'));
    const unitPriceNumber = Number(line.unitPrice.replace(',', '.'));
    if (!Number.isFinite(quantityNumber) || !Number.isFinite(unitPriceNumber)) {
      return sum;
    }
    return sum + Math.round(quantityNumber * unitPriceNumber * 100);
  }, 0);

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLine(id: number, field: keyof LineState, value: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    }));
  }

  function addLine() {
    const defaultTaxRate = taxRates[0]?.id ?? '';
    const defaultAccountCode = accounts[0]?.code ?? '';
    setForm((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          id: lineCounter,
          description: '',
          quantity: '1',
          unitPrice: '',
          taxRateId: defaultTaxRate,
          accountCode: defaultAccountCode
        }
      ]
    }));
    setLineCounter((value) => value + 1);
  }

  function removeLine(id: number) {
    setForm((current) => {
      const nextLines = current.lines.filter((line) => line.id !== id);
      if (nextLines.length === 0) {
        const defaultTaxRate = taxRates[0]?.id ?? '';
        const defaultAccountCode = accounts[0]?.code ?? '';
        return {
          ...current,
          lines: [
            {
              id: lineCounter,
              description: '',
              quantity: '1',
              unitPrice: '',
              taxRateId: defaultTaxRate,
              accountCode: defaultAccountCode
            }
          ]
        };
      }
      return { ...current, lines: nextLines };
    });
    setLineCounter((value) => value + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (vendors.length === 0) {
      setError('Add a vendor before recording a bill.');
      return;
    }

    if (!form.vendorId) {
      setError('Select a vendor');
      return;
    }

    const preparedLines = [];

    for (const line of form.lines) {
      if (!line.description.trim()) {
        setError('Each line requires a description.');
        return;
      }

      const quantity = Number(line.quantity.replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError('Quantity must be a positive number');
        return;
      }

      const unitPrice = Number(line.unitPrice.replace(',', '.'));
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        setError('Unit prices must be positive numbers');
        return;
      }

      const unitPriceNet = Math.round(unitPrice * 100);
      preparedLines.push({
        description: line.description.trim(),
        quantity,
        unitPriceNet,
        taxRateId: line.taxRateId || undefined,
        accountCode: line.accountCode || undefined
      });
    }

    if (preparedLines.length === 0) {
      setError('Add at least one bill line.');
      return;
    }

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorId: form.vendorId,
          issueDate: form.issueDate,
          dueDate: form.dueDate,
          currency: 'DKK',
          lines: preparedLines
        })
      });

      if (!response.ok) {
        let message = 'Failed to create bill';
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
      console.error('Failed to submit bill form', networkError);
      setError('Unable to reach the API. Please try again.');
      return;
    }

    setForm({ ...initialState });
    startTransition(() => {
      router.refresh();
    });
  }

  if (vendors.length === 0) {
    return <p>Create a vendor before recording a bill.</p>;
  }

  if (accounts.length === 0) {
    return <p>Add at least one expense account before recording bills.</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        <span>Vendor</span>
        <select value={form.vendorId} onChange={(event) => updateField('vendorId', event.target.value)} required>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
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
      <div>
        <h3>Bill lines</h3>
        {form.lines.map((line) => (
          <div key={line.id} className="line-item">
            <label>
              <span>Description</span>
              <input
                type="text"
                value={line.description}
                onChange={(event) => updateLine(line.id, 'description', event.target.value)}
                placeholder="Office supplies"
                required
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.quantity}
                onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                required
              />
            </label>
            <label>
              <span>Unit price (DKK)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.unitPrice}
                onChange={(event) => updateLine(line.id, 'unitPrice', event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              <span>Tax rate</span>
              <select
                value={line.taxRateId}
                onChange={(event) => updateLine(line.id, 'taxRateId', event.target.value)}
              >
                <option value="">No tax</option>
                {taxRates.map((taxRate) => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Expense account</span>
              <select
                value={line.accountCode}
                onChange={(event) => updateLine(line.id, 'accountCode', event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} – {account.name}
                  </option>
                ))}
              </select>
            </label>
            {form.lines.length > 1 ? (
              <button type="button" onClick={() => removeLine(line.id)}>
                Remove line
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addLine}>
          Add line
        </button>
      </div>
      {totalOre > 0 ? <p>Bill total: {formatDKK(totalOre)}</p> : null}
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Record bill'}
      </button>
    </form>
  );
}
