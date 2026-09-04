import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Public-entry route: if the visitor has no account, silently mint a guest
// so challenge links land in gameplay instead of a login wall.
const GuestGateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, guestLogin } = useAuth();
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const attempted = useRef(false);

  const enter = useCallback(() => {
    setError('');
    setRetrying(true);
    guestLogin()
      .catch(err => setError(err?.message || 'Could not start a guest session'))
      .finally(() => setRetrying(false));
  }, [guestLogin]);

  useEffect(() => {
    if (!loading && !user && !attempted.current) {
      attempted.current = true;
      enter();
    }
  }, [loading, user, enter]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
        <div role="alert" className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black p-6 sm:p-8 text-center w-full max-w-sm shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15]">
          <p className="font-black uppercase mb-2">Could not enter</p>
          <p className="font-mono text-sm break-words mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={enter}
              disabled={retrying}
              aria-busy={retrying}
              className="w-full sm:w-auto bg-cyan-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px] disabled:opacity-50 disabled:pointer-events-none"
            >
              {retrying ? 'Trying…' : 'Retry'}
            </button>
            <Link to="/login" className="w-full sm:w-auto">
              <button className="w-full bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px]">
                Log in instead
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 flex items-center justify-center p-4 sm:p-6" aria-busy="true">
        <div className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black p-6 sm:p-8 w-full max-w-sm text-center shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15]">
          <p className="font-mono font-black uppercase mb-3">Entering the wasteland…</p>
          <span className="block h-4 w-full bg-black/15 dark:bg-yellow-400/20 animate-pulse" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

export default GuestGateRoute;
