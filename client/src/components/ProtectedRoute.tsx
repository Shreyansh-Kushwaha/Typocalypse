import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Same paper/ink shell as the page that is about to render, so the screen
    // never flashes an unstyled "Loading..." on a white background.
    return (
      <div
        className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans flex items-center justify-center p-4 sm:p-6"
        aria-busy="true"
      >
        <div className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black p-6 sm:p-8 w-full max-w-sm text-center shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15]">
          <p className="font-black uppercase tracking-widest mb-3">Checking your session</p>
          <span className="block h-4 w-full bg-black/15 dark:bg-yellow-400/20 animate-pulse" />
          <p className="font-mono text-xs font-bold uppercase mt-3 text-black/60 dark:text-yellow-400/60">
            One moment…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
