'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      startTransition(() => {
        router.push('/auth/login');
        router.refresh();
      });
    }
  }

  return (
    <button type="button" onClick={handleLogout} disabled={isPending}>
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
