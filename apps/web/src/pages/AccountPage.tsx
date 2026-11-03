import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PlayerProfile } from '@pondbound/shared';
import { supabase } from '../lib/supabase';
import { ApiRequestError, initializePlayer } from '../lib/api';
import { LoadingState } from '../components/LoadingState';

export default function AccountPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<{ token: string; player: PlayerProfile } | null>(null);
  const [profileError, setProfileError] = useState<{ token: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const token = session?.access_token;

  useEffect(() => {
    if (!supabase) return;
    let disposed = false;
    let eventReceived = false;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      eventReceived = true;
      if (!disposed) setSession(nextSession);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || eventReceived) return;
      setSession(error ? null : data.session);
      if (error) setNotice('Your saved session could not be restored. Please sign in again.');
    }).catch(() => {
      if (!disposed && !eventReceived) { setSession(null); setNotice('Your saved session could not be restored. Please sign in again.'); }
    });
    return () => { disposed = true; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!token) return;
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setProfileError(null);
    void initializePlayer(token, controller.signal).then(player => {
      if (!disposed) setProfile({ token, player });
    }).catch(error => {
      if (!disposed) setProfileError({ token, message: error instanceof ApiRequestError && error.status === 401
        ? 'Your session could not be verified. Sign out and sign in again.'
        : 'Your profile could not load. Try again in a moment.' });
    }).finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [token, attempt]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) setNotice('Unable to sign in. Check your email and password, then try again.');
      else { setPassword(''); setSession(data.session); }
    } catch { setNotice('Unable to sign in right now. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true); setNotice(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) setNotice('Unable to sign out right now. Please try again.');
      else { setSession(null); setProfile(null); setProfileError(null); }
    } catch { setNotice('Unable to sign out right now. Please try again.'); }
    finally { setBusy(false); }
  }

  if (!supabase) return <section className="message-panel"><p className="eyebrow">Your account</p><h1>Sign-in is not available yet.</h1><p>You can still visit the pond preview while account services are being prepared.</p></section>;
  if (session === undefined) return <LoadingState label="Restoring your session…" />;

  const currentProfile = token && profile?.token === token ? profile.player : null;
  const currentError = token && profileError?.token === token ? profileError.message : null;
  return (
    <section className="message-panel account-panel" aria-labelledby="account-heading">
      <p className="eyebrow">Your place by the pond</p>
      <h1 id="account-heading">{session ? 'Welcome back.' : 'Sign in to Pondbound.'}</h1>
      {notice && <p className="form-notice" role="alert">{notice}</p>}
      {session ? <>
        <p>{session.user.email}</p>
        {currentProfile ? <p role="status">Your Pondbound profile is ready.</p>
          : currentError ? <div className="profile-feedback"><p role="alert">{currentError}</p><button className="text-link" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : <LoadingState label="Opening your profile…" />}
        <div className="actions"><button className="button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
      </> : <form className="account-form" onSubmit={event => void signIn(event)} aria-busy={busy}>
        <label htmlFor="account-email">Email<input id="account-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
        <label htmlFor="account-password">Password<input id="account-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
        <button className="button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>}
    </section>
  );
}
