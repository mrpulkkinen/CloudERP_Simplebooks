'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

interface FormState {
  name: string;
  email: string;
  phone: string;
  vatNumber: string;
  notes: string;
}

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  vatNumber: '',
  notes: ''
};

export function NewCustomerForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof FormState>(field: K, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    const response = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        vatNumber: form.vatNumber.trim() || undefined,
        notes: form.notes.trim() || undefined
      })
    });

    if (!response.ok) {
      let message = 'Failed to create customer';
      try {
        const body = await response.json();
        message = body?.error?.message ?? message;
      } catch (parseError) {
        console.error('Failed to parse error response', parseError);
      }
      setError(message);
      return;
    }

    setForm(initialState);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        <span>Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="e.g. Acme ApS"
          required
        />
      </label>
      <label>
        <span>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="name@example.com"
        />
      </label>
      <label>
        <span>Phone</span>
        <input
          type="tel"
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="+45 12 34 56 78"
        />
      </label>
      <label>
        <span>VAT Number</span>
        <input
          type="text"
          value={form.vatNumber}
          onChange={(event) => updateField('vatNumber', event.target.value)}
          placeholder="DK12345678"
        />
      </label>
      <label>
        <span>Notes</span>
        <input
          type="text"
          value={form.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          placeholder="Optional notes"
        />
      </label>
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Create customer'}
      </button>
    </form>
  );
}
