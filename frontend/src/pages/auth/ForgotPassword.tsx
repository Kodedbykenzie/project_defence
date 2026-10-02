import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, CheckCircle2Icon, KeyRoundIcon, LockIcon, MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TextInput } from '../../components/auth/TextInput';
import { OtpInput } from '../../components/auth/OtpInput';
import { PasswordStrength, passwordScore } from '../../components/auth/PasswordStrength';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { primaryButton } from '../../utils/styles';

type Step = 'email' | 'code' | 'password' | 'done';
const order: Step[] = ['email', 'code', 'password'];
const btn = `${primaryButton} mt-5 h-11 w-full md:h-10`;

function Head({ icon: Icon, title, children }: {icon: typeof MailIcon;title: string;children?: React.ReactNode;}) {
  return (
    <>
      <span className="mt-6 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl">{title}</h1>
      {children && <p className="mt-1 text-sm leading-6 text-muted">{children}</p>}
    </>);

}

export function ForgotPassword() {
  const { resetPassword, emailExists } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const sendCode = () => {
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(c);
    setCode('');
    setCooldown(30);
    toast('Reset code sent', { description: `Demo code: ${c}`, duration: 10000 });
  };

  const later = (fn: () => void) => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      fn();
    }, 500);
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    later(() => {
      if (emailExists(email)) sendCode();
      setStep('code');
    });
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    later(() => code === sentCode ? setStep('password') : setCodeError(true));
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    later(() => {
      resetPassword(email, password);
      setStep('done');
    });
  };

  const stepIndex = order.indexOf(step);

  return (
    <div>
      {step !== 'done' &&
      <>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeftIcon className="h-4 w-4" /> Sign in
          </Link>
          <div className="mt-4 flex gap-1.5" aria-label={`Step ${stepIndex + 1} of 3`}>
            {order.map((s, i) =>
          <span key={s} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= stepIndex ? 'bg-brand-600' : 'bg-line'}`} />
          )}
          </div>
        </>
      }

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
          {step === 'email' &&
          <form onSubmit={submitEmail} noValidate>
              <Head icon={MailIcon} title="Forgot password?">
                We’ll email you a 6-digit code.
              </Head>
              <label htmlFor="reset-email" className="mb-1 mt-5 block text-sm font-medium text-ink">
                Email
              </label>
              <TextInput id="reset-email" icon={MailIcon} type="email" autoComplete="email" placeholder="you@alustudent.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              <button type="submit" disabled={loading || !/^\S+@\S+\.\S+$/.test(email)} className={btn}>
                {loading && <Spinner />} Send code
              </button>
            </form>
          }

          {step === 'code' &&
          <form onSubmit={submitCode} noValidate>
              <Head icon={KeyRoundIcon} title="Check your inbox">
                Sent to <span className="font-medium text-ink">{email}</span> ·{' '}
                <button type="button" onClick={() => setStep('email')} className="font-semibold text-brand-700 hover:underline">
                  Change
                </button>
              </Head>
              <div className="mt-5">
                <OtpInput value={code} onChange={(v) => {setCode(v);setCodeError(false);}} invalid={codeError} />
                {codeError && <p className="mt-2 text-xs text-rose-600">That code doesn’t match.</p>}
              </div>
              <button type="submit" disabled={loading || code.length < 6} className={btn}>
                {loading && <Spinner />} Verify
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                <button type="button" disabled={cooldown > 0} onClick={sendCode} className="font-semibold text-brand-700 hover:underline disabled:font-normal disabled:text-faint disabled:no-underline">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </p>
            </form>
          }

          {step === 'password' &&
          <form onSubmit={submitPassword} noValidate>
              <Head icon={LockIcon} title="New password" />
              <label htmlFor="new-pw" className="mb-1 mt-5 block text-sm font-medium text-ink">
                Password
              </label>
              <TextInput id="new-pw" icon={LockIcon} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <PasswordStrength password={password} />
              <label htmlFor="confirm-pw" className="mb-1 mt-3 block text-sm font-medium text-ink">
                Confirm
              </label>
              <TextInput id="confirm-pw" icon={LockIcon} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={!!confirm && confirm !== password} />
              {confirm && confirm !== password && <p className="mt-1 text-xs text-rose-600">Passwords don’t match.</p>}
              <button type="submit" disabled={loading || passwordScore(password) < 2 || password !== confirm} className={btn}>
                {loading && <Spinner />} Reset password
              </button>
            </form>
          }

          {step === 'done' &&
          <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2Icon className="h-6 w-6" />
              </span>
              <h1 className="mt-3 text-xl font-semibold text-ink">Password updated</h1>
              <p className="mt-1 text-sm text-muted">Sign in with your new password.</p>
              <button type="button" onClick={() => navigate('/login')} className={btn}>
                Back to sign in
              </button>
            </div>
          }
        </motion.div>
      </AnimatePresence>
    </div>);

}