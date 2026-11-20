'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { consoleOfPath } from '@bunk3d/core';

type Step = { kind: 'credentials' } | { kind: 'code'; challengeId: string; emailHint: string };

/** Only follow `next` when it is a console path on this site. */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return consoleOfPath(next.split('?')[0]) ? next : null;
}

function Form() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get('next'));
  const [step, setStep] = useState<Step>({ kind: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('expired') ? 'Your session ended. Sign in again to continue.' : null);

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { json } = await post('/api/auth/sign-in', { email, password });
      if (json.ok) { const c = json.challenge as { challengeId: string; emailHint: string }; setStep({ kind: 'code', ...c }); setCode(''); }
      else if (json.reason === 'locked') setError(`Too many tries. Try again in ${json.retryInMinutes} minutes.`);
      else setError('That email or password isn’t right.');
    } catch { setError('We couldn’t reach the server. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== 'code') return;
    setBusy(true); setError(null);
    try {
      const { json } = await post('/api/auth/verify', { challengeId: step.challengeId, code });
      if (json.ok) { router.replace(next ?? (json.home as string)); router.refresh(); return; }
      if (json.reason === 'expired') { setStep({ kind: 'credentials' }); setPassword(''); setError('That code expired. Sign in again to get a new one.'); }
      else if (json.reason === 'locked') setError(`Too many wrong codes. Try again in ${json.retryInMinutes} minutes.`);
      else { setError(`That code isn’t right.${typeof json.triesLeft === 'number' && json.triesLeft > 0 ? ` ${json.triesLeft} ${json.triesLeft === 1 ? 'try' : 'tries'} left.` : ''}`); setCode(''); }
    } catch { setError('We couldn’t reach the server. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="card login-card">
      <div className="display wordmark" style={{ fontSize: 28 }} aria-label="Bunk3d">bunk<b>3</b>d</div>
      {step.kind === 'credentials' ? (
        <form onSubmit={submitCredentials} className="login-card" noValidate>
          <div>
            <h1 className="display">Sign in</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>For club leads, college teams, brands, vendors and the Bunk3d team.</p>
          </div>
          {error ? <div role="alert" className="alert err">{error}</div> : null}
          <div className="field"><label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button type="submit" className="btn primary" disabled={busy || !email || !password}>{busy ? 'Signing in' : 'Continue'}</button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="login-card" noValidate>
          <div>
            <h1 className="display">Check your email</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>We sent a 6-digit code to {step.emailHint}. It works for 10 minutes.</p>
          </div>
          {error ? <div role="alert" className="alert err">{error}</div> : null}
          <div className="field"><label htmlFor="code">6-digit code</label><input id="code" className="codeinput" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus /></div>
          <button type="submit" className="btn primary" disabled={busy || code.length !== 6}>{busy ? 'Checking' : 'Sign in'}</button>
          <button type="button" className="btn ghost" onClick={() => { setStep({ kind: 'credentials' }); setError(null); setPassword(''); }}>Use a different account</button>
        </form>
      )}
    </div>
  );
}

export function LoginForm() {
  return <Suspense><Form /></Suspense>;
}
