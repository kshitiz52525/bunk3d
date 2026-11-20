import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in · Bunk3d' };

export default function LoginPage() {
  return (
    <main className="login">
      <LoginForm />
    </main>
  );
}
