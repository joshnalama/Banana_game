import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import { SPONGEBOB_AVATARS } from '../../../shared/src/constants.js';
import { eventBus } from '../services/eventBus.js';

export default function IdentityPromptModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('login'); // login | register | guest
  const [form, setForm] = useState({ username: '', email: '', password: '', guestName: '', avatar: '🧽' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setError('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      let result;
      if (tab === 'guest') {
        result = await api('/api/auth/guest', {
          method: 'POST',
          body: { guestName: form.guestName, avatar: form.avatar },
        });
      } else if (tab === 'login') {
        result = await api('/api/auth/login', {
          method: 'POST',
          body: { username: form.username, password: form.password },
        });
      } else {
        result = await api('/api/auth/register', {
          method: 'POST',
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
            avatar: form.avatar,
          },
        });
      }

      eventBus.emit('audio:play', { sound: 'fanfare' });
      onAuthenticated(result.user);
      onClose();
    } catch (err) {
      setError(err.message);
      eventBus.emit('audio:play', { sound: 'wrong' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-backdrop">
      <motion.div
        className="auth-modal-card"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header with Bikini Bottom Brand */}
        <div className="auth-header">
          <div className="auth-avatar-hero">{form.avatar}</div>
          <h2>Virtual Identity Portal</h2>
          <p>Join the Krusty Krab Fry Cook League or explore as an anonymous guest.</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'guest' ? 'active' : ''}`}
            onClick={() => { setTab('guest'); setError(''); }}
          >
            Instant Guest 🚀
          </button>
        </div>

        {/* Avatar Selector for Register & Guest */}
        {(tab === 'register' || tab === 'guest') && (
          <div className="avatar-picker-strip">
            <span className="picker-label">Choose Character:</span>
            <div className="avatar-options">
              {SPONGEBOB_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  className={`avatar-option-btn ${form.avatar === av.icon ? 'selected' : ''}`}
                  onClick={() => {
                    setForm({ ...form, avatar: av.icon });
                    eventBus.emit('audio:play', { sound: 'bubble' });
                  }}
                  title={av.name}
                >
                  {av.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleAuthSubmit} className="auth-form">
          {tab === 'guest' ? (
            <label className="input-field">
              <span>Guest Nickname (optional)</span>
              <input
                type="text"
                placeholder="e.g. KrabbyFan"
                value={form.guestName}
                onChange={handleChange('guestName')}
                maxLength={16}
              />
            </label>
          ) : (
            <>
              <label className="input-field">
                <span>{tab === 'login' ? 'Username or Email' : 'Username'}</span>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={handleChange('username')}
                  autoComplete="username"
                  placeholder="e.g. FryCook_007"
                />
              </label>

              {tab === 'register' && (
                <label className="input-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange('email')}
                    autoComplete="email"
                    placeholder="spongebob@bikinibottom.com"
                  />
                </label>
              )}

              <label className="input-field">
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={tab === 'register' ? 8 : 1}
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                />
              </label>
            </>
          )}

          {error && <div className="auth-error-box">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={busy}>
            {busy ? 'Verifying Identity…' : tab === 'login' ? 'Log In to Play' : tab === 'register' ? 'Create Account' : 'Start Instant Guest Match'}
          </button>
        </form>

        {/* Google OAuth Option */}
        <div className="auth-divider">
          <span>OR SECURE IDENTITY VIA</span>
        </div>

        <GoogleSignInButton
          onCredentialSuccess={(user) => {
            eventBus.emit('audio:play', { sound: 'fanfare' });
            onAuthenticated(user);
            onClose();
          }}
          onError={setError}
        />
      </motion.div>
    </div>
  );
}

