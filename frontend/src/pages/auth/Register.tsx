import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, GraduationCapIcon, LockIcon, MailIcon, TicketIcon, UserIcon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthTabs } from '../../components/auth/AuthTabs';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { GoogleAccountModal } from '../../components/auth/GoogleAccountModal';
import { TextInput } from '../../components/auth/TextInput';
import { PasswordStrength, passwordScore } from '../../components/auth/PasswordStrength';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform } from '../../contexts/PlatformContext';
import { universities } from '../../data/domains';
import { DEMO_INVITE_CODE } from '../../data/seed';
import { normaliseCode } from '../../utils/invite';
import { inputClass, primaryButton } from '../../utils/styles';
import type { Invite } from '../../types/platform';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'consent' | 'form', string>>;
type CodeState = {status: 'idle' | 'checking';} | {status: 'valid';invite: Invite;} | {status: 'invalid';error: string;};

export function Register() {
  const { register, loginWithGoogle } = useAuth();
  const { checkInvite } = usePlatform();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [codeState, setCodeState] = useState<CodeState>({ status: 'idle' });
  const [form, setForm] = useState({ name: '', email: '', password: '', university: universities[0], consent: false });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  useEffect(() => {
    const c = normaliseCode(code);
    if (c.length < 6) return setCodeState({ status: 'idle' });
    setCodeState({ status: 'checking' });
    const id = window.setTimeout(() => {
      const r = checkInvite(c);
      setCodeState(r.ok ? { status: 'valid', invite: r.invite } : { status: 'invalid', error: r.error });
      if (r.ok && r.invite.email) setForm((f) => ({ ...f, email: r.invite.email! }));
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const invite = codeState.status === 'valid' ? codeState.invite : null;
  const set = <K extends keyof typeof form,>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!invite) return;
    const e: Errors = {};
    if (form.name.trim().split(' ').filter(Boolean).length < 2) e.name = 'Enter first and last name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (passwordScore(form.password) < 2) e.password = '8+ characters with a capital, number or symbol.';
    if (!form.consent) e.consent = 'Required to join the pilot.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    window.setTimeout(() => {
      const result = register({ ...form, inviteCode: invite.code });
      setLoading(false);
      if (!result.ok) return setErrors({ form: result.error });
      toast.success('Account created');
      navigate('/onboarding', { replace: true });
    }, 600);
  };

  return (
    <div>
      <AuthTabs active="register" />
      <h1 className="mt-6 text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl">Join the pilot</h1>
      <p className="mt-1 text-sm text-muted">Imari is invite-only. Enter your code to start.</p>

      <div className="mt-5">
        <label htmlFor="invite" className="mb-1.5 block text-sm font-medium text-ink">
          Invite code
        </label>
        <TextInput
          id="invite"
          icon={TicketIcon}
          autoComplete="off"
          spellCheck={false}
          placeholder="ALU-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          invalid={codeState.status === 'invalid'}
          className="font-mono uppercase tracking-wider"
          trailing={
          <span className="pr-2.5">
              {codeState.status === 'checking' && <Spinner className="h-4 w-4 text-brand-600" />}
              {codeState.status === 'valid' && <CheckCircle2Icon className="h-5 w-5 text-emerald-500" />}
              {codeState.status === 'invalid' && <XCircleIcon className="h-5 w-5 text-rose-500" />}
            </span>
          } />
        
        <div className="mt-1.5 min-h-[20px] text-xs leading-5">
          {codeState.status === 'invalid' && <p className="text-rose-600">{codeState.error}</p>}
          {invite &&
          <p className="truncate text-emerald-700">
              Valid · {invite.email ? `for ${invite.email}` : invite.note ?? 'ALU pilot'}
            </p>
          }
          {codeState.status === 'idle' &&
          <p className="text-muted">
              No code? Ask your coordinator.{' '}
              <button type="button" onClick={() => setCode(DEMO_INVITE_CODE)} className="font-semibold text-brand-700 hover:underline">
                Use demo
              </button>
            </p>
          }
        </div>
      </div>

      <AnimatePresence initial={false}>
        {invite &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden">
          
            <div className="pt-4">
              <GoogleButton label="Sign up with Google" onClick={() => setGoogleOpen(true)} disabled={loading} />
              <div className="my-4 flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
              </div>
              <form onSubmit={onSubmit} className="space-y-3" noValidate>
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
                    Full name
                  </label>
                  <TextInput id="name" icon={UserIcon} autoComplete="name" placeholder="Aline Uwimana" value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} />
                  {errors.name && <p className="mt-1.5 text-xs text-rose-600">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-ink">
                    Email
                  </label>
                  <TextInput
                  id="reg-email"
                  icon={MailIcon}
                  type="email"
                  autoComplete="email"
                  placeholder="you@alustudent.com"
                  value={form.email}
                  readOnly={!!invite.email}
                  onChange={(e) => set('email', e.target.value)}
                  invalid={!!errors.email} />
                
                  {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-ink">
                    Password
                  </label>
                  <TextInput
                  id="reg-password"
                  icon={LockIcon}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  invalid={!!errors.password}
                  trailing={
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink">
                        {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                  } />
                
                  {errors.password ? <p className="mt-1.5 text-xs text-rose-600">{errors.password}</p> : <PasswordStrength password={form.password} />}
                </div>
                <div>
                  <label htmlFor="university" className="mb-1.5 block text-sm font-medium text-ink">
                    University
                  </label>
                  <div className="relative">
                    <GraduationCapIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <select id="university" className={`${inputClass} h-11 truncate pl-9 md:h-10`} value={form.university} onChange={(e) => set('university', e.target.value)}>
                      {universities.map((u) =>
                    <option key={u}>{u}</option>
                    )}
                    </select>
                  </div>
                </div>
                <label className={`flex gap-2.5 rounded-lg border p-3 text-xs leading-5 text-muted ${errors.consent ? 'border-rose-300 bg-rose-50/50' : 'border-line bg-subtle'}`}>
                  <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span>I’m 18+ and consent to anonymised research use. I can withdraw anytime.</span>
                </label>
                {errors.form &&
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                    {errors.form}
                  </p>
              }
                <button type="submit" disabled={loading} className={`${primaryButton} h-11 w-full md:h-10`}>
                  {loading ?
                <>
                      <Spinner /> Creating…
                    </> :

                'Create account'
                }
                </button>
              </form>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <GoogleAccountModal
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onSelect={(e, n) => {
          const r = loginWithGoogle(e, n, invite?.code);
          setGoogleOpen(false);
          if (!r.ok) return setErrors({ form: r.error });
          toast.success(r.isNew ? 'Account created' : `Welcome back, ${r.user.name.split(' ')[0]}`);
          navigate(r.isNew ? '/onboarding' : r.user.role === 'admin' ? '/admin' : '/app', { replace: true });
        }} />
      
    </div>);

}