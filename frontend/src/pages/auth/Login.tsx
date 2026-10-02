import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthTabs } from '../../components/auth/AuthTabs';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { GoogleAccountModal } from '../../components/auth/GoogleAccountModal';
import { TextInput } from '../../components/auth/TextInput';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_ADMIN_EMAIL, DEMO_PASSWORD, DEMO_STUDENT_EMAIL } from '../../data/seed';
import { homeFor } from '../../utils/format';
import { primaryButton } from '../../utils/styles';

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {from?: string;} | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const go = (role: 'student' | 'admin', name: string) => {
    toast.success(`Welcome back, ${name.split(' ')[0]}`);
    const home = homeFor(role);
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  };

  const signIn = (e: string, p: string) => {
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      const result = login(e, p);
      setLoading(false);
      if (!result.ok) return setError(result.error);
      go(result.user.role, result.user.name);
    }, 500);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password.');
    signIn(email, password);
  };

  return (
    <div>
      <AuthTabs active="login" />
      <h1 className="mt-6 text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to continue learning.</p>

      <div className="mt-5">
        <GoogleButton label="Continue with Google" onClick={() => setGoogleOpen(true)} disabled={loading} />
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <TextInput id="email" icon={MailIcon} type="email" autoComplete="email" placeholder="you@alustudent.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
              Forgot?
            </Link>
          </div>
          <TextInput
            id="password"
            icon={LockIcon}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error}
            trailing={
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink">
                {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            } />
          
        </div>
        {error &&
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm leading-5 text-rose-700">
            {error}
          </p>
        }
        <button type="submit" disabled={loading} className={`${primaryButton} h-11 w-full md:h-10`}>
          {loading ?
          <>
              <Spinner /> Signing in…
            </> :

          'Sign in'
          }
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
        <span className="shrink-0">Demo:</span>
        <button type="button" disabled={loading} onClick={() => signIn(DEMO_STUDENT_EMAIL, DEMO_PASSWORD)} className="rounded-full bg-subtle px-3 py-1.5 font-medium text-ink hover:bg-brand-50 hover:text-brand-700">
          Student
        </button>
        <button type="button" disabled={loading} onClick={() => signIn(DEMO_ADMIN_EMAIL, DEMO_PASSWORD)} className="rounded-full bg-subtle px-3 py-1.5 font-medium text-ink hover:bg-brand-50 hover:text-brand-700">
          Admin
        </button>
      </div>

      <GoogleAccountModal
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onSelect={(e, n) => {
          const r = loginWithGoogle(e, n);
          setGoogleOpen(false);
          if (r.ok) return go(r.user.role, r.user.name);
          if (r.needsInvite) {
            toast('No account yet', { description: 'Join with your invite code.' });
            navigate('/register');
          } else setError(r.error);
        }} />
      
    </div>);

}