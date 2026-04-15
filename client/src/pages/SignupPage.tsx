import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SignupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('SECURITY BREACH: Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signup(username, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'ENROLLMENT FAILED. THE SYSTEM REJECTS YOU.');
    } finally {
      setLoading(false);
    }
  };

  // Brutalist CSS constants
  const brutalShadowLight = "shadow-[8px_8px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[8px_8px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none";

  const passwordMismatch = confirmPassword && password !== confirmPassword;

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black flex items-center justify-center py-12 px-6 relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 w-full max-w-md">
        
        {/* Main Brutalist Container */}
        <div className={`bg-white dark:bg-black border-4 border-black dark:border-yellow-400 ${brutalShadowLight} ${brutalShadowDark} flex flex-col`}>
          
          {/* Header Block */}
          <div className="bg-green-400 dark:bg-yellow-400 border-b-4 border-black dark:border-yellow-400 p-6 text-center relative overflow-hidden">
            {/* Decorative stripes */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-black dark:bg-black opacity-10 transform translate-x-8 -translate-y-8 rotate-45 border-8 border-black"></div>
            
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black relative z-10">
              New Recruit
            </h1>
            <p className="font-mono text-sm font-bold text-black mt-1 bg-white/80 dark:bg-black/10 inline-block px-2 border-2 border-black relative z-10">
              REGISTER BIOMETRICS
            </p>
          </div>

          <div className="p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500 text-black border-4 border-black p-3 font-mono font-bold uppercase text-sm animate-pulse">
                &gt; {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div className="space-y-2">
                <label className="block font-black uppercase tracking-widest text-sm text-black dark:text-yellow-400">
                  Callsign (Username)
                </label>
                <input
                  type="text"
                  placeholder="CyberNinja99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-[#f4f4f0] dark:bg-black border-4 border-black dark:border-yellow-400 p-3 font-mono text-black dark:text-yellow-400 focus:bg-cyan-100 dark:focus:bg-yellow-400/10 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-yellow-400/30"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block font-black uppercase tracking-widest text-sm text-black dark:text-yellow-400">
                  Comms_Link (Email)
                </label>
                <input
                  type="email"
                  placeholder="target@typocalypse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#f4f4f0] dark:bg-black border-4 border-black dark:border-yellow-400 p-3 font-mono text-black dark:text-yellow-400 focus:bg-cyan-100 dark:focus:bg-yellow-400/10 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-yellow-400/30"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block font-black uppercase tracking-widest text-sm text-black dark:text-yellow-400">
                  Secret_Key (Password)
                </label>
                <input
                  type="password"
                  placeholder="DONT_USE_PASSWORD123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#f4f4f0] dark:bg-black border-4 border-black dark:border-yellow-400 p-3 font-mono text-black dark:text-yellow-400 focus:bg-cyan-100 dark:focus:bg-yellow-400/10 focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-yellow-400/30"
                />
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="block font-black uppercase tracking-widest text-sm text-black dark:text-yellow-400">
                  Verify_Key
                </label>
                <input
                  type="password"
                  placeholder="TYPE_IT_AGAIN"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full bg-[#f4f4f0] dark:bg-black border-4 p-3 font-mono focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-yellow-400/30 ${
                    passwordMismatch 
                      ? 'border-red-500 text-red-500 focus:bg-red-100 dark:focus:bg-red-900/20' 
                      : 'border-black dark:border-yellow-400 text-black dark:text-yellow-400 focus:bg-cyan-100 dark:focus:bg-yellow-400/10'
                  }`}
                />
                {passwordMismatch && (
                  <p className="text-red-500 font-mono text-xs font-bold uppercase mt-1">
                    &gt; KEYS DO NOT MATCH
                  </p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="w-6 h-6 shrink-0 appearance-none border-4 border-black dark:border-yellow-400 bg-white dark:bg-black checked:bg-black dark:checked:bg-yellow-400 cursor-pointer transition-colors mt-1"
                  />
                  <span className="text-xs font-bold uppercase font-mono text-black dark:text-yellow-400 leading-relaxed">
                    I AGREE TO SURVIVE THE{' '}
                    <Link to="#" className="underline decoration-2 underline-offset-4 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors px-1">
                      TERMS OF SERVICE
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !!passwordMismatch}
                className={`w-full mt-4 bg-black text-white dark:bg-yellow-400 dark:text-black border-4 border-black dark:border-yellow-400 font-black text-xl px-6 py-4 uppercase transition-all shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#facc15] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none dark:active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'FORGING PROFILE...' : 'ENROLL NOW →'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-1 bg-black dark:bg-yellow-400" />
              <span className="font-black uppercase tracking-widest text-black dark:text-yellow-400">OR</span>
              <div className="flex-1 h-1 bg-black dark:bg-yellow-400" />
            </div>

            {/* Social Sign Up */}
            <button className={`w-full flex items-center justify-center gap-3 bg-white dark:bg-black border-4 border-black dark:border-yellow-400 font-black text-lg px-6 py-3 uppercase transition-all shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#facc15] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:active:shadow-none text-black dark:text-yellow-400`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Override
            </button>
            
          </div>
          
          {/* Footer Link */}
          <div className="bg-gray-200 dark:bg-yellow-400/10 border-t-4 border-black dark:border-yellow-400 p-4 text-center">
            <p className="font-mono text-sm font-bold uppercase text-black dark:text-yellow-400">
              ALREADY IN THE SYSTEM?{' '}
              <Link to="/login" className="text-pink-600 dark:text-yellow-400 underline decoration-2 underline-offset-4 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors px-1">
                LOGIN HERE
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;