"use client";

import HomeLink from "@/components/HomeLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

function friendlyError(raw: string): string {
  if (/Failed to fetch|fetch failed|NetworkError/i.test(raw)) {
    return "连不上 Supabase，检查网络或代理后再试";
  }
  if (/Invalid login credentials/i.test(raw)) return "邮箱或密码不正确";
  if (/Email not confirmed/i.test(raw)) return "邮箱还没确认，先去邮件里点确认链接";
  if (/User already registered/i.test(raw)) return "这个邮箱已经注册过了，直接登录吧";
  if (/Password should be at least/i.test(raw)) return "密码太短，至少 6 位";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "signup" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push("/diary");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push("/diary");
        } else {
          setMessage("注册成功，请到邮箱点击确认链接后再登录");
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "操作失败";
      setError(friendlyError(raw));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">树</span>
          <h1>{SITE_NAME}</h1>
          <HomeLink style={{ marginLeft: "auto" }} />
        </div>

        <div className="tabs">
          <button
            type="button"
            className={mode === "signin" ? "on" : ""}
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === "signup" ? "on" : ""}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </div>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="password2">确认密码</label>
              <input
                id="password2"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再输一次"
                autoComplete="new-password"
                required
              />
            </div>
          )}
          <button type="submit" className="primary-btn auth-submit" disabled={busy}>
            {busy ? "请稍候…" : mode === "signin" ? "登录" : "注册"}
          </button>
        </form>

        {error && <div className="notice" style={{ color: "var(--danger)", background: "transparent", border: "1px solid var(--border)" }}>{error}</div>}
        {message && <div className="notice">{message}</div>}

        <div className="auth-hint">
          {mode === "signin" ? "还没有账号？点上面的「注册」" : "注册后日记默认只有你自己能看见"}
        </div>
      </div>
    </div>
  );
}
