"use client";

import HomeLink from "@/components/HomeLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import { describeAuthError, diagnoseConnection } from "@/lib/authDiagnostics";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setRawError(null);
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
      const info = describeAuthError(err);
      setRawError(info.raw && info.raw !== info.title ? info.raw : null);

      if (info.network) {
        setError(`${info.title}\n正在诊断网络…`);
        const detail = await diagnoseConnection();
        setError(`${info.title}\n${detail}`);
      } else {
        setError(info.title);
      }
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
              setRawError(null);
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
              setRawError(null);
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

        {error && (
          <div
            className="notice error-notice"
            style={{ color: "var(--danger)", background: "transparent", border: "1px solid var(--border)" }}
          >
            {error}
            {rawError && <div className="error-raw">技术详情：{rawError}</div>}
          </div>
        )}
        {message && <div className="notice">{message}</div>}

        <div className="auth-hint">
          {mode === "signin" ? "还没有账号？点上面的「注册」" : "注册后日记默认只有你自己能看见"}
        </div>
      </div>
    </div>
  );
}
