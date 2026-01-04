'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!response.ok) {
        let message = 'Unable to sign in';
        try {
          const body = await response.json();
          message = body?.error?.message ?? message;
        } catch (parseError) {
          console.error('Failed to parse login error', parseError);
        }
        setError(message);
        return;
      }
    } catch (networkError) {
      console.error('Failed to submit login form', networkError);
      setError('Unable to reach the API. Please try again.');
      return;
    }

    startTransition(() => {
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <section className="card" style={{ maxWidth: 420 }}>
      <h2>Sign in</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        <button type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
