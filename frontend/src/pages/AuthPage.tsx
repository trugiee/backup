import { useState } from 'react';
import { login, registerCollector, forgotPassword } from '../api';
import type { User } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          prompt: (momentListener?: (notification: { getMomentType: () => string }) => void) => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { error?: string; id_token?: string; access_token?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

interface AuthPageProps {
  onAuth: (token: string, user: User) => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(true);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [regName, setRegName] = useState('');
 const [regEmail, setRegEmail] = useState('');
 const [regPassword, setRegPassword] = useState('');
 const [regPhone, setRegPhone] = useState('');
 const [regAddress, setRegAddress] = useState('');
 const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 try {
 const data = await login(email, password);
 onAuth(data.token, data.user);
 } catch {
 setError('Network error. Please try again.');
 } finally {
 setLoading(false);
 }
 };

 const handleRegister = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 try {
 const data = await registerCollector({
 name: regName,
 email: regEmail,
 password: regPassword,
 phone: regPhone,
 address: regAddress,
 });
 onAuth(data.token, data.user);
 } catch {
 setError('Network error. Please try again.');
 } finally {
 setLoading(false);
 }
 };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const data = await forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!window.google) {
      setError('Google sign-in is not available.');
      return;
    }
    setGoogleLoading(true);
    setError('');

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '697894913360-879mqud5sqfh17cmcrcq92um12pav4ci.apps.googleusercontent.com',
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error) {
          setError(response.error);
          setGoogleLoading(false);
          return;
        }
        try {
          // id_token might not be returned, use access_token
          const data = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.access_token }),
          });
          const json = await data.json();
          if (!data.ok) throw new Error(json.error || `HTTP ${data.status}`);
          onAuth(json.token, json.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    client.requestAccessToken();
  };

  return (
    <>
    <div className="min-h-screen bg-white flex relative overflow-hidden font-sans">
 <div
 className={`absolute top-0 left-0 w-full lg:w-1/2 h-full flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32 z-10 transition-all duration-700 ease-in-out ${ isRegisterMode ? 'opacity-100 translate-x-0 pointer-events-auto delay-300' : 'opacity-0 -translate-x-8 pointer-events-none' }`}
 >
 <div className="w-full max-w-md mx-auto">
  <div className="mb-6 sm:mb-10 text-left">
  <div className="flex items-center gap-3 mb-2 sm:mb-3">
  <img
  src="/logo-icon.png"
  alt="Ggallery Logo"
  onClick={() => setShowCredit(true)}
  className="h-8 sm:h-12 w-auto object-contain shrink-0 drop-shadow-sm cursor-pointer"
  />
  <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
  Become a Collector
  </h1>
  </div>
  <p className="text-zinc-500 text-sm sm:text-base">
  Create an account to showcase your artwork.
  </p>
  </div>

          <form className="space-y-3 sm:space-y-4" onSubmit={handleRegister}>
 <div className="space-y-1 sm:space-y-2">
 <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="reg-name">
 Full Name
 </label>
 <input
 id="reg-name"
 type="text"
 value={regName}
 onChange={(e) => setRegName(e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
 placeholder="Collector Name"
 required
 />
 </div>
 <div className="space-y-1 sm:space-y-2">
 <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="reg-email">
 Email address
 </label>
 <input
 id="reg-email"
 type="email"
 value={regEmail}
 onChange={(e) => setRegEmail(e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
 placeholder="name@example.com"
 required
 />
 </div>
  <div className="space-y-1 sm:space-y-2">
  <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="reg-password">
  Password
  </label>
  <div className="relative">
  <input
  id="reg-password"
  type={showRegPassword ? 'text' : 'password'}
  value={regPassword}
  onChange={(e) => setRegPassword(e.target.value)}
  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 pr-10 sm:pr-12 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
  placeholder="••••••••"
  required
  />
  <button
  type="button"
  onClick={() => setShowRegPassword(!showRegPassword)}
  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
  >
  {showRegPassword ? (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )}
  </button>
  </div>
  </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div className="space-y-1 sm:space-y-2">
 <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="reg-phone">
 Phone{' '}
 <span className="text-zinc-400 font-normal">(Optional)</span>
 </label>
 <input
 id="reg-phone"
 type="text"
 value={regPhone}
 onChange={(e) => setRegPhone(e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
 placeholder="+1 234 567"
 />
 </div>
 <div className="space-y-1 sm:space-y-2">
 <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="reg-address">
 Address{' '}
 <span className="text-zinc-400 font-normal">(Optional)</span>
 </label>
 <input
 id="reg-address"
 type="text"
 value={regAddress}
 onChange={(e) => setRegAddress(e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
 placeholder="City, Country"
 />
 </div>
 </div>
 <div className="pt-1 sm:pt-2">
 <button
 type="submit"
 disabled={loading}
 className="w-full bg-zinc-900 hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl shadow-xl shadow-zinc-900/20 transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-zinc-900/30 text-sm sm:text-base"
 >
 {loading ? (
 <span className="flex items-center justify-center gap-3">
 <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Creating...
 </span>
 ) : (
 'Create Account'
 )}
 </button>
 </div>
  </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-xs text-zinc-400 font-medium">or</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-zinc-300 rounded-lg px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-wait"
          >
            {googleLoading ? (
              <svg className="animate-spin w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p className="mt-5 sm:mt-6 text-center lg:text-left text-xs sm:text-sm text-zinc-500 font-medium">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsRegisterMode(false)}
              className="text-zinc-900 hover:underline font-bold"
            >
              Sign in instead
            </button>
          </p>
 </div>
 </div>

 <div
 className={`w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32 relative z-10 transition-all duration-700 ease-in-out ml-auto ${ isRegisterMode ? 'opacity-0 translate-x-8 pointer-events-none absolute right-0 top-0 h-full' : 'opacity-100 translate-x-0 pointer-events-auto delay-300' }`}
 >
 <div className="w-full max-w-md mx-auto">
  <div className="mb-6 sm:mb-10 text-left">
  <div className="flex items-center gap-3 mb-2 sm:mb-3">
  <img
  src="/logo-icon.png"
  alt="Ggallery Logo"
  onClick={() => setShowCredit(true)}
  className="h-8 sm:h-12 w-auto object-contain shrink-0 drop-shadow-sm cursor-pointer"
  />
  <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
  Welcome Back
  </h1>
  </div>
  <p className="text-zinc-500 text-sm sm:text-base">Sign in to your account to continue.</p>
  </div>

          {error && (
            <div className="mb-4 sm:mb-6 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50/80 border border-red-200 rounded-xl sm:rounded-2xl text-red-600 text-xs sm:text-sm font-semibold flex items-center justify-center lg:justify-start gap-2">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          <form className="space-y-4 sm:space-y-6" onSubmit={handleLogin}>
 <div className="space-y-1 sm:space-y-2">
 <label className="text-xs sm:text-sm font-bold text-zinc-800 block" htmlFor="email">
 Email address
 </label>
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
 placeholder="name@example.com"
 required
 />
 </div>
 <div className="space-y-1 sm:space-y-2">
 <label
 className="text-xs sm:text-sm font-bold text-zinc-800 flex justify-between items-center"
 htmlFor="password"
 >
 <span>Password</span>
  <button
  type="button"
  onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setForgotSent(false); }}
  className="text-zinc-500 hover:text-zinc-900 :text-zinc-100 font-medium text-[10px] sm:text-xs transition-colors"
  >
  Forgot password?
  </button>
 </label>
  <div className="relative">
  <input
  id="password"
  type={showPassword ? 'text' : 'password'}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 pr-10 sm:pr-12 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all duration-300"
  placeholder="••••••••"
  required
  />
  <button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
  >
  {showPassword ? (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )}
  </button>
  </div>
  </div>
 <div className="pt-1 sm:pt-2">
 <button
 type="submit"
 disabled={loading}
 className="w-full bg-zinc-900 hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl shadow-xl shadow-zinc-900/20 transform transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-zinc-900/30 text-sm sm:text-base"
 >
 {loading ? (
 <span className="flex items-center justify-center gap-3">
 <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Signing in...
 </span>
 ) : (
 'Sign In'
 )}
 </button>
 </div>
 </form>

 <p className="mt-6 sm:mt-8 text-center lg:text-left text-xs sm:text-sm text-zinc-500 font-medium">
 Don't have an account?{' '}
 <button
 type="button"
 onClick={() => setIsRegisterMode(true)}
 className="text-zinc-900 hover:underline font-bold"
 >
 Create collector account
 </button>
 </p>
 </div>
 </div>

 <div
 className={`hidden lg:flex absolute top-0 w-1/2 left-0 h-full bg-white p-6 items-center justify-center overflow-hidden z-20 transition-transform duration-700 ease-in-out ${ isRegisterMode ? 'translate-x-full' : 'translate-x-0' }`}
 >
 <div className="absolute inset-0 bg-zinc-950 overflow-hidden rounded-[2.5rem] m-4 shadow-sm border border-zinc-900">
 <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-zinc-800/40 to-transparent rounded-full blur-3xl opacity-70" />
 <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-zinc-900/50 to-transparent rounded-full blur-3xl opacity-70" />
 <div className="relative w-full h-full flex flex-col items-center justify-center p-12 text-center">
 <img
 src="/logo-white.png"
 alt="Ggallery Logo Large"
 className="w-28 md:w-36 h-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transform transition-transform hover:scale-105 duration-700 ease-in-out"
 />
 </div>
  </div>
  </div>
  </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-zinc-900 dark:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight text-center">Reset Password</h2>
            {forgotSent ? (
              <>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-6">
                  If that email exists, a new password has been sent. Check your inbox and spam folder.
                </p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-black shadow-lg shadow-zinc-900/20 transition-all"
                >
                  Done
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-5">
                  Enter your email and we'll send you a new temporary password.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all mb-5"
                  placeholder="name@example.com"
                  required
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-black shadow-lg shadow-zinc-900/20 transition-all disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {showCredit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setShowCredit(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white text-black w-full max-w-xl mx-4"
          >
            <div className="relative min-h-[400px] overflow-hidden">
              <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full border-[12px] border-black/5" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border-8 border-black/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-black/5 rounded-full" />
              <div className="absolute top-0 right-0 w-1/3 h-px bg-black/10" />
              <div className="absolute bottom-0 left-0 w-1/3 h-px bg-black/10" />

              <div className="relative px-12 py-14">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[7px] uppercase tracking-[0.5em] text-zinc-400 font-mono">Developer</p>
                    <div className="mt-6">
                      <p className="text-4xl sm:text-5xl font-black tracking-tighter text-black leading-[0.9] uppercase">
                        TRUDGE
                      </p>
                      <p className="text-4xl sm:text-5xl font-black tracking-tighter text-black leading-[0.9] uppercase mt-1">
                        SABIDO
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-5xl sm:text-6xl font-black tracking-tighter text-black leading-none">INSONG</span>
                        <div className="w-8 h-8 border-2 border-black rounded-full shrink-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-black rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex items-center gap-4">
                  <div className="h-[2px] w-16 bg-black" />
                  <div>
                    <p className="text-[9px] font-mono tracking-[0.4em] text-zinc-500 uppercase">Ggallery</p>
                    <p className="text-[7px] font-mono tracking-[0.3em] text-zinc-300 uppercase mt-0.5">Art Management Platform</p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-6">
                  <button
                    onClick={() => setShowCredit(false)}
                    className="text-[8px] uppercase tracking-[0.4em] text-zinc-400 hover:text-black transition-colors duration-300 cursor-pointer font-mono"
                  >
                    Close
                  </button>
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-black/20 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-black/40 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
