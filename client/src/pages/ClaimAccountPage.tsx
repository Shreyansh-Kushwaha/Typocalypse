import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SeoFor } from '../seo';

// Upgrade a guest session into a permanent account, keeping all progress.
const ClaimAccountPage: React.FC = () => {
  const { user, claimAccount } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const brutalShadow = 'shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15]';

  if (user && !user.isGuest) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return; // a second submit while in flight would double-post the claim
    setBusy(true);
    setError('');
    try {
      await claimAccount(username.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Could not claim account');
      setBusy(false);
    }
  };

  const inputClass =
    'w-full border-4 border-black dark:border-yellow-400 bg-white dark:bg-black px-4 py-3 font-mono text-base sm:text-lg outline-none focus:shadow-[4px_4px_0px_0px_#ff007f] dark:focus:shadow-[4px_4px_0px_0px_#fff]';

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
      <SeoFor path="/claim" />
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className={`relative z-10 w-full max-w-md bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-5 sm:p-8 ${brutalShadow}`}>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter border-b-4 border-black dark:border-yellow-400 pb-3 mb-2">
          Claim your account
        </h1>
        <p className="font-mono text-sm font-bold mb-6 break-words">
          You are playing as <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1 break-all">{user?.username}</span>.
          Add an email and password to keep your progress forever.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="claim-username" className="font-black uppercase text-xs tracking-widest block mb-1">Username</label>
            <input
              id="claim-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="claim-email" className="font-black uppercase text-xs tracking-widest block mb-1">Email</label>
            <input
              id="claim-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@wasteland.net"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="claim-password" className="font-black uppercase text-xs tracking-widest block mb-1">Password</label>
            <input
              id="claim-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="at least 6 characters"
              className={inputClass}
            />
          </div>

          <div aria-live="polite">
            {error && (
              <p role="alert" className="font-mono font-bold text-sm uppercase text-black bg-red-500 border-4 border-black px-3 py-2 break-words">
                &gt; {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className={`w-full bg-green-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-lg sm:text-xl uppercase py-4 transition-all ${brutalShadow} hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none`}
          >
            {busy ? 'Claiming…' : 'Claim account'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full font-mono font-bold text-sm uppercase underline py-2 min-h-[40px]"
          >
            Maybe later — keep playing as guest
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClaimAccountPage;
