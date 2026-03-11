import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setSuccess(
            "Аккаунт создан! Если вас не пустило автоматически, значит в Supabase всё ещё включено подтверждение почты (Confirm email).",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white font-sans">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-900 opacity-50"></div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-black text-xl mx-auto mb-4">
            R
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            ROBO Sync
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {isSignUp
              ? "Создайте аккаунт для синхронизации"
              : "Войдите в свой аккаунт"}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-500 border border-emerald-500/20">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="sr-only" htmlFor="email-address">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors"
                placeholder="Email адрес"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-colors"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 shadow-[0_0_15px_rgba(5,150,105,0.3)] hover:shadow-[0_0_25px_rgba(5,150,105,0.5)]"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : isSignUp ? (
                "Зарегистрироваться"
              ) : (
                "Войти"
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors font-medium"
            >
              {isSignUp
                ? "Уже есть аккаунт? Войти"
                : "Нет аккаунта? Зарегистрироваться"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
