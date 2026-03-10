import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@shared/index';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isSubmitting } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget =
    typeof location.state === 'object' && location.state !== null && 'from' in location.state
      ? ((location.state.from as { pathname?: string } | undefined)?.pathname ?? ROUTES.dashboard)
      : ROUTES.dashboard;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login({ username, password });

      navigate(username === 'admin' ? ROUTES.admin : redirectTarget, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Giriş alınmadı. Yenidən cəhd edin.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6f6] px-6 py-8 dark:bg-[#221610]">
      <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center px-8 pb-8 pt-12">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ec5b13] shadow-lg shadow-[#ec5b13]/20">
            <span className="text-3xl text-white">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Xoş gəlmisiniz</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Davam etmək üçün daxil olun</p>
        </div>

        <form className="space-y-5 px-8 pb-10" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              E-poçt və ya telefon
            </span>
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-200 focus-within:border-[#ec5b13] focus-within:shadow-[0_0_0_1px_#ec5b13] dark:border-zinc-700 dark:bg-zinc-800/50">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">@</span>
              <input
                className="h-14 w-full rounded-2xl border-none bg-transparent pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
                name="username"
                placeholder="numune@mail.com"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </label>

          <div className="space-y-1.5">
            <label className="ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Şifrə
            </label>
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-200 focus-within:border-[#ec5b13] focus-within:shadow-[0_0_0_1px_#ec5b13] dark:border-zinc-700 dark:bg-zinc-800/50">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">🔒</span>
              <input
                className="h-14 w-full rounded-2xl border-none bg-transparent pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
                name="password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#ec5b13]"
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <a className="text-xs font-semibold text-[#ec5b13] hover:underline" href="#">
                Şifrəni unutmusunuz?
              </a>
            </div>
          </div>

          <button
            className="mt-4 h-14 w-full rounded-2xl bg-[#ec5b13] font-bold text-white shadow-lg shadow-[#ec5b13]/25 transition active:scale-[0.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Yüklənir...' : 'Daxil ol'}
          </button>

          {errorMessage ? (
            <div className="rounded-2xl border border-[#f5d6d6] bg-[#fff4f4] p-4 text-sm text-[#a63939]">
              {errorMessage}
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}
