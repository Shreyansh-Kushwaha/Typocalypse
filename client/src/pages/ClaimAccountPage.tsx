import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    'w-full border-4 border-black dark:border-yellow-400 bg-white dark:bg-black px-4 py-3 font-mono text-lg outline-none focus:shadow-[4px_4px_0px_0px_#ff007f] dark:focus:shadow-[4px_4px_0px_0px_#fff]';

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className={`relative z-10 w-full max-w-md bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-8 ${brutalShadow}`}>
        <h1 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black dark:border-yellow-400 pb-3 mb-2">
          Claim your account
        </h1>
        <p className="font-mono text-sm font-bold mb-6">
          You are playing as <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">{user?.username}</span>.
          Add an email and password to keep your progress forever.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-black uppercase text-xs tracking-widest">Username</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="font-black uppercase text-xs tracking-widest">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@wasteland.net"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="font-black uppercase text-xs tracking-widest">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="at least 6 characters"
              className={inputClass}
            />
          </label>

          {error && (
            <p className="font-mono font-bold text-sm text-white bg-red-600 border-2 border-black px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`w-full bg-green-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-xl uppercase py-4 transition-all ${brutalShadow} hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none disabled:opacity-50`}
          >
            {busy ? 'Claiming…' : 'Claim account'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full font-mono font-bold text-sm uppercase underline"
          >
            Maybe later — keep playing as guest
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClaimAccountPage;
