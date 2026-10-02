import React, { useState, FormEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { BellIcon, DownloadIcon, LockIcon, PaletteIcon, RotateCcwIcon, ShieldIcon, UserIcon, BoxIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../components/ui/Switch";
import { AlertDialog } from "../components/ui/AlertDialog";
import { TextInput } from "../components/auth/TextInput";
import { PasswordStrength, passwordScore } from "../components/auth/PasswordStrength";
import { LanguageControl, Segmented, TextSizeControl } from "../components/settings/PreferenceControls";
import { kindStyle } from "../components/notifications/NotificationRow";
import { useAuth } from "../contexts/AuthContext";
import { usePlatform } from "../contexts/PlatformContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { formatDate, initialsOf } from "../utils/format";
import { primaryButton, secondaryButton } from "../utils/styles";
import { NotificationKind } from "../types/platform";
type Tab = 'account' | 'appearance' | 'notifications' | 'security' | 'privacy';
const tabs: {
  id: Tab;
  label: string;
  icon: BoxIcon;
}[] = [{
  id: 'account',
  label: 'Account',
  icon: UserIcon
}, {
  id: 'appearance',
  label: 'Display',
  icon: PaletteIcon
}, {
  id: 'notifications',
  label: 'Alerts',
  icon: BellIcon
}, {
  id: 'security',
  label: 'Security',
  icon: LockIcon
}, {
  id: 'privacy',
  label: 'Privacy',
  icon: ShieldIcon
}];
const kindLabels: Record<NotificationKind, string> = {
  credential: 'Credentials',
  course: 'New courses',
  assessment: 'Assessments',
  student: 'New students',
  invite: 'Invites',
  system: 'Reminders'
};
export function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.id === params.get('tab'))?.id ?? 'account') as Tab;
  return <div className="mx-auto w-full max-w-4xl px-4 py-5 md:px-8 md:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Settings</h1>
      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
        <nav aria-label="Settings sections" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0">
          {tabs.map(({
          id,
          label,
          icon: Icon
        }) => <button key={id} type="button" onClick={() => setParams({
          tab: id
        }, {
          replace: true
        })} aria-current={tab === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 md:rounded-lg md:py-2 ${tab === id ? 'bg-brand-600 text-white md:bg-brand-50 md:text-brand-700' : 'bg-subtle text-muted hover:text-ink md:bg-transparent'}`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>)}
        </nav>
        <div className="min-w-0 space-y-4">
          {tab === 'account' && <AccountSection />}
          {tab === 'appearance' && <AppearanceSection />}
          {tab === 'notifications' && <NotificationsSection />}
          {tab === 'security' && <SecuritySection />}
          {tab === 'privacy' && <PrivacySection />}
        </div>
      </div>
    </div>;
}
function Card({
  title,
  children,
  footer




}: {title: string;children: ReactNode;footer?: ReactNode;}) {
  return <section className="rounded-xl border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
    </section>;
}
function Row({
  label,
  hint,
  children




}: {label: string;hint?: string;children: ReactNode;}) {
  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs leading-5 text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>;
}
function AccountSection() {
  const {
    user,
    updateName
  } = useAuth();
  const {
    learners
  } = usePlatform();
  const [name, setName] = useState(user?.name ?? '');
  if (!user) return null;
  const learner = learners[user.id];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return;
    updateName(name.trim());
    toast.success('Name updated');
  };
  return <>
      <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initialsOf(user.name)}</span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{user.name}</p>
          <p className="break-all text-xs text-muted">
            {user.role === 'admin' ? 'Admin' : 'Student'} · {user.email}
          </p>
        </div>
      </div>
      <form onSubmit={submit}>
        <Card title="Profile" footer={<button type="submit" disabled={name.trim() === user.name || name.trim().length < 3} className={primaryButton}>
              Save
            </button>}>
          <div className="grid gap-3 px-4 py-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-muted">
              Full name
              <div className="mt-1">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </label>
            <label className="block text-xs font-medium text-muted">
              Email
              <div className="mt-1">
                <TextInput value={user.email} disabled />
              </div>
            </label>
          </div>
          {learner && <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-sm md:grid-cols-3">
              <div className="col-span-2 md:col-span-1">
                <dt className="text-xs text-muted">University</dt>
                <dd className="font-medium text-ink">{learner.university}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Programme</dt>
                <dd className="font-medium text-ink">{learner.program}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Joined</dt>
                <dd className="font-medium text-ink">{formatDate(learner.joinedAt)}</dd>
              </div>
            </dl>}
        </Card>
      </form>
    </>;
}
function AppearanceSection() {
  const {
    reduceMotion,
    railOpen,
    update
  } = usePreferences();
  return <Card title="Display">
      <Row label="Language" hint="Menus and greetings">
        <LanguageControl />
      </Row>
      <Row label="Text size" hint="Scales text, cards and buttons">
        <TextSizeControl />
      </Row>
      <Row label="Reduce motion" hint="Turns off animations">
        <Switch checked={reduceMotion} onChange={(v) => update({
        reduceMotion: v
      })} label="Reduce motion" />
      </Row>
      <Row label="Side panel" hint="Show “At a glance” on tablets and desktop">
        <Switch checked={railOpen} onChange={(v) => update({
        railOpen: v
      })} label="Side panel" />
      </Row>
    </Card>;
}
function NotificationsSection() {
  const {
    user
  } = useAuth();
  const {
    toasts,
    mutedKinds,
    emailDigest,
    toggleKind,
    update
  } = usePreferences();
  const kinds: NotificationKind[] = user?.role === 'admin' ? ['student', 'assessment', 'credential', 'invite', 'course'] : ['credential', 'course', 'assessment', 'system'];
  return <>
      <Card title="Delivery">
        <Row label="Pop-up alerts" hint="Show new alerts while you’re in the app">
          <Switch checked={toasts} onChange={(v) => update({
          toasts: v
        })} label="Pop-up alerts" />
        </Row>
        <Row label="Email digest">
          <Segmented name="Email digest" value={emailDigest} onChange={(v) => update({
          emailDigest: v
        })} options={[{
          id: 'off',
          label: 'Off'
        }, {
          id: 'daily',
          label: 'Daily'
        }, {
          id: 'weekly',
          label: 'Weekly'
        }]} />
        </Row>
      </Card>
      <Card title="Alert types">
        {kinds.map((k) => {
        const {
          icon: Icon,
          tone
        } = kindStyle[k];
        return <div key={k} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{kindLabels[k]}</span>
              <Switch checked={!mutedKinds.includes(k)} onChange={() => toggleKind(k)} label={kindLabels[k]} />
            </div>;
      })}
      </Card>
    </>;
}
function SecuritySection() {
  const {
    user,
    resetPassword,
    logout
  } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signOutAll, setSignOutAll] = useState(false);
  if (!user) return null;
  const valid = passwordScore(pw) >= 2 && pw === confirm;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    resetPassword(user.email, pw);
    setPw('');
    setConfirm('');
    toast.success('Password updated');
  };
  return <>
      <form onSubmit={submit}>
        <Card title={user.provider === 'google' ? 'Add a password' : 'Change password'} footer={<button type="submit" disabled={!valid} className={primaryButton}>
              Update
            </button>}>
          <div className="grid gap-3 px-4 py-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-muted">
              New password
              <div className="mt-1">
                <TextInput type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <PasswordStrength password={pw} />
            </label>
            <label className="block text-xs font-medium text-muted">
              Confirm
              <div className="mt-1">
                <TextInput type="password" autoComplete="new-password" value={confirm} invalid={!!confirm && confirm !== pw} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </label>
          </div>
        </Card>
      </form>
      <Card title="Sessions">
        <Row label="This device" hint="Active now · Kigali">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>
        </Row>
        <Row label="Sign out everywhere" hint="Ends every session, including this one">
          <button type="button" onClick={() => setSignOutAll(true)} className={secondaryButton}>
            Sign out
          </button>
        </Row>
      </Card>
      <AlertDialog open={signOutAll} onClose={() => setSignOutAll(false)} onConfirm={logout} tone="warning" title="Sign out everywhere?" description="You’ll need to sign in again on every device." confirmLabel="Sign out" />
    </>;
}
function PrivacySection() {
  const {
    user,
    logout,
    resetDemo
  } = useAuth();
  const {
    learners,
    credentials
  } = usePlatform();
  const {
    consent,
    setConsent
  } = usePreferences();
  const [dialog, setDialog] = useState<'withdraw' | 'delete' | 'reset' | null>(null);
  if (!user) return null;
  const learner = learners[user.id];
  const download = () => {
    const data = {
      account: user,
      learner,
      credentials: credentials.filter((c) => c.learnerId === user.id),
      exportedAt: new Date().toISOString()
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `imari-data-${user.id}.json`
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Your data was downloaded');
  };
  return <>
      <Card title="Cookies">
        <Row label="Current choice" hint={consent ? `Analytics ${consent.analytics ? 'on' : 'off'} · Preferences ${consent.preferences ? 'on' : 'off'}` : 'Not set'}>
          <button type="button" onClick={() => setConsent(null)} className={secondaryButton}>
            Change
          </button>
        </Row>
      </Card>
      <Card title="Your data">
        <Row label="Download my data" hint="Profile, progress and credentials as JSON">
          <button type="button" onClick={download} className={secondaryButton}>
            <DownloadIcon className="h-4 w-4" /> Download
          </button>
        </Row>
        {user.role === 'student' && <Row label="Research consent" hint="Your data stays, but leaves the study results">
            <button type="button" onClick={() => setDialog('withdraw')} className={secondaryButton}>
              Withdraw
            </button>
          </Row>}
        <Row label="Reset demo data" hint="Restores the original prototype data">
          <button type="button" onClick={() => setDialog('reset')} className={secondaryButton}>
            <RotateCcwIcon className="h-4 w-4" /> Reset
          </button>
        </Row>
      </Card>
      <section className="rounded-xl border border-rose-200 bg-rose-50/40">
        <Row label="Delete account" hint="Credentials already on Sepolia stay verifiable but are revoked">
          <button type="button" onClick={() => setDialog('delete')} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100">
            Delete
          </button>
        </Row>
      </section>

      <AlertDialog open={dialog === 'withdraw'} onClose={() => setDialog(null)} onConfirm={() => void toast.success('Consent withdrawn', {
      description: 'You’re excluded from pilot analysis.'
    })} tone="warning" title="Withdraw from the study?" description="You can keep learning. Your results won’t be included in the research." confirmLabel="Withdraw" />
      <AlertDialog open={dialog === 'reset'} onClose={() => setDialog(null)} onConfirm={resetDemo} tone="warning" title="Reset all demo data?" description="Progress, new accounts and credentials in this browser are cleared." confirmLabel="Reset" />
      <AlertDialog open={dialog === 'delete'} onClose={() => setDialog(null)} onConfirm={() => {
      toast('Deletion requested', {
        description: 'The pilot team will confirm within 7 days.'
      });
      logout();
    }} tone="danger" title="Delete your account?" description="This can’t be undone." confirmLabel="Delete" confirmWord="DELETE" />
    </>;
}