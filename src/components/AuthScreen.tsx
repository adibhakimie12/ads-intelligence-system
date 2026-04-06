import React, { useState } from 'react';
import { ArrowRight, Crown, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, isConfigured, continueInDemoMode } = useAuth();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const result = mode === 'sign_in'
      ? await signIn(email, password)
      : await signUp(email, password, workspaceName);

    if (result.error) {
      setError(result.error);
    } else if (result.message) {
      setMessage(result.message);
    }

    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signInWithGoogle();

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-on-surface lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1360px] gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="dark-panel flex flex-col justify-between rounded-[2.5rem] p-8 text-white lg:p-12">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
                <Crown size={18} />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-container">Ads Intelligence</p>
                <p className="text-sm font-medium text-white/70">Customer workspace access</p>
              </div>
            </div>

            <h1 className="max-w-xl font-headline text-[3.8rem] font-extrabold leading-[0.95] tracking-[-0.06em]">
              Sign in to your sales intelligence workspace.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/72">
              This is the first foundation step for the real SaaS version: authenticated access before we add
              workspaces, per-customer Meta connections, and secure data sync.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: LockKeyhole, title: 'Secure access', body: 'Email/password authentication with session persistence.' },
              { icon: ShieldCheck, title: 'Workspace-ready', body: 'Structured so we can add tenant boundaries next.' },
              { icon: Mail, title: 'Customer flow', body: 'Supports customer onboarding instead of owner-only access.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <item.icon size={18} className="text-primary-container" />
                <h2 className="mt-4 text-sm font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/68">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-surface flex flex-col justify-center rounded-[2.5rem] p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">
              {mode === 'sign_in' ? 'Sign In' : 'Create Account'}
            </p>
            <h2 className="mt-3 font-headline text-3xl font-bold tracking-[-0.04em] text-on-surface">
              {mode === 'sign_in' ? 'Welcome back' : 'Start your workspace'}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
              {isConfigured
                ? 'Use your Supabase-backed account to enter the app.'
                : 'Supabase is not configured yet. You can still preview the product in demo mode while we wire the real backend.'}
            </p>

            {!isConfigured && (
              <div className="mt-6 rounded-[1.75rem] border border-secondary/20 bg-secondary/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Setup Needed</p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Add <code className="font-mono text-on-surface">VITE_SUPABASE_URL</code> and{' '}
                  <code className="font-mono text-on-surface">VITE_SUPABASE_ANON_KEY</code> to enable real authentication.
                </p>
              </div>
            )}

            {isConfigured && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center rounded-full border border-outline-variant/50 bg-white px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-on-surface transition-all hover:border-primary-container hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Redirecting...' : 'Continue With Google'}
              </button>
            )}

            {isConfigured && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/40" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Or use email</span>
                <div className="h-px flex-1 bg-outline-variant/40" />
              </div>
            )}

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {mode === 'sign_up' && (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Workspace Name</span>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white/80 px-4 py-3.5 text-sm font-medium text-on-surface outline-none transition-all focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
                    placeholder="Acme Growth Team"
                    minLength={3}
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/40 bg-white/80 px-4 py-3.5 text-sm font-medium text-on-surface outline-none transition-all focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
                  placeholder="you@company.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/40 bg-white/80 px-4 py-3.5 text-sm font-medium text-on-surface outline-none transition-all focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </label>

              {error && (
                <div role="alert" className="rounded-2xl border border-error/15 bg-error-container/60 px-4 py-3 text-sm font-medium text-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Processing' : mode === 'sign_in' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
                  setError(null);
                  setMessage(null);
                  setWorkspaceName('');
                }}
                className="font-bold text-primary transition-colors hover:text-secondary"
              >
                {mode === 'sign_in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
              </button>

              <button
                type="button"
                onClick={continueInDemoMode}
                className="text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Continue in demo mode
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
