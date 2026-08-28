import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Public-entry route: if the visitor has no account, silently mint a guest
// so challenge links land in gameplay instead of a login wall.
const GuestGateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, guestLogin } = useAuth();
  const [error, setError] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (!loading && !user && !attempted.current) {
      attempted.current = true;
      guestLogin().catch(err => setError(err?.message || 'Could not start a guest session'));
    }
  }, [loading, user, guestLogin]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 flex items-center justify-center p-6">
        <div className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black p-8 text-center max-w-sm">
          <p className="font-black uppercase mb-2">Could not enter</p>
          <p className="font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 flex items-center justify-center">
        <p className="font-mono font-black animate-pulse">ENTERING THE WASTELAND…</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default GuestGateRoute;
