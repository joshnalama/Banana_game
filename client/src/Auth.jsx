import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const gbtn = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // "Continue with Google" only appears when the server has a Google client ID.
  useEffect(() => {
    let off = false;
    api('/api/config').then(({ googleClientId }) => {
      if (!googleClientId || off) return;
      const init = () => {
        if (off || !gbtn.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setErr('');
            try { onAuth((await api('/api/auth/google', { method: 'POST', body: { credential } })).user); }
            catch (e) { setErr(e.message); }
          },
        });
        window.google.accounts.id.renderButton(gbtn.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300 });
        setGoogle(true);
      };
      if (window.google?.accounts) return init();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init;
      document.head.appendChild(s);
    }).catch(() => {});
    return () => { off = true; };
  }, [onAuth]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = mode === 'login' ? { username: f.username, password: f.password } : f;
      onAuth((await api(`/api/auth/${mode}`, { method: 'POST', body })).user);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <div className="hero">
        <div className="big-banana">🍌</div>
        <h1>Banana Digits</h1>
        <p>Find the missing digit in each banana puzzle. Fast answers and few hints earn more points.</p>
      </div>
      <div className="authcol">
        <form className="card form" onSubmit={submit} key={mode}>
          <h2>{mode === 'login' ? 'Log in to play' : 'Create your account'}</h2>
          <label>{mode === 'login' ? 'Username or email' : 'Username'}
            <input value={f.username} onChange={set('username')} autoComplete="username" required />
          </label>
          {mode === 'register' && (
            <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
          )}
          <label>Password
            <input type="password" value={f.password} onChange={set('password')} minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </label>
          {err && <div className="error" role="alert">{err}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
          </button>
        </form>
        {google && <div className="or">or</div>}
        <div ref={gbtn} className="gbtn" />
      </div>
    </div>
  );
}
