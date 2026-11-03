import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

const NETWORK_PATTERN =
  /failed to fetch|fetch failed|networkerror|load failed|network request failed|err_network|err_internet|err_name_not_resolved|timed? out|timeout/i;

type AuthErrorLike = {
  message?: unknown;
  code?: unknown;
  error_description?: unknown;
  status?: unknown;
};

function rawMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const value = err as AuthErrorLike;
    if (typeof value.message === "string" && value.message) return value.message;
    if (typeof value.error_description === "string" && value.error_description) {
      return value.error_description;
    }
  }
  return "";
}

function statusOf(err: unknown): number | null {
  if (err && typeof err === "object") {
    const value = err as AuthErrorLike;
    if (typeof value.status === "number") return value.status;
    if (typeof value.status === "string" && /^\d+$/.test(value.status)) {
      return Number(value.status);
    }
  }
  return null;
}

export type AuthErrorInfo = {
  title: string;
  raw: string;
  network: boolean;
};

export function describeAuthError(err: unknown): AuthErrorInfo {
  const raw = rawMessage(err);
  const status = statusOf(err);

  if (NETWORK_PATTERN.test(raw)) {
    return { title: "连不上 Supabase 服务", raw, network: true };
  }
  if (/invalid login credentials/i.test(raw)) {
    return {
      title: "邮箱或密码不正确；如果还没注册过，请先切换到「注册」",
      raw,
      network: false,
    };
  }
  if (/email not confirmed/i.test(raw)) {
    return {
      title: "邮箱还没确认：先去收件箱点确认链接，再回来登录",
      raw,
      network: false,
    };
  }
  if (/user already registered/i.test(raw)) {
    return { title: "这个邮箱已经注册过了，直接切到「登录」", raw, network: false };
  }
  if (/password should be at least|password.*characters/i.test(raw)) {
    return { title: "密码太短，Supabase 要求至少 6 位", raw, network: false };
  }
  if (/unable to validate email|invalid email|email address is invalid/i.test(raw)) {
    return { title: "邮箱格式不正确，请检查有没有多打空格或缺少 @", raw, network: false };
  }
  if (/rate limit|too many requests|for security purposes/i.test(raw) || status === 429) {
    return {
      title: "操作太频繁，被 Supabase 限流了；等 10 分钟到 1 小时后再试，或换一个邮箱",
      raw,
      network: false,
    };
  }
  if (/signups? .*disabled|signup is disabled|email provider is disabled/i.test(raw)) {
    return {
      title: "这个 Supabase 项目关闭了邮箱注册，请到 Authentication → Providers 里启用 Email",
      raw,
      network: false,
    };
  }
  if (/database error saving new user/i.test(raw)) {
    return {
      title: "Supabase 创建用户时数据库报错，通常是 profiles 相关 SQL 或触发器没执行好",
      raw,
      network: false,
    };
  }
  if (/invalid api key|no api key found|jwt/i.test(raw)) {
    return {
      title: "Supabase anon key 配置有误，请检查环境变量 NEXT_PUBLIC_SUPABASE_ANON_KEY",
      raw,
      network: false,
    };
  }
  if (status === 403) {
    return { title: "Supabase 拒绝了这个请求（403），检查项目权限或密钥", raw, network: false };
  }
  if (status !== null && status >= 500) {
    return {
      title: `Supabase 服务端出错（HTTP ${status}），项目可能被暂停或正在维护，去控制台看一下项目状态`,
      raw,
      network: false,
    };
  }

  return { title: raw || "登录失败，请稍后重试", raw, network: false };
}

function hostOf(): string {
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return SUPABASE_URL;
  }
}

export async function diagnoseConnection(): Promise<string> {
  const host = hostOf();
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return `能解析到 ${host}，但服务返回 HTTP ${res.status}：项目可能被暂停、URL 或 anon key 配置有误，请到 Supabase 控制台确认项目状态。`;
    }
    return `可以访问 ${host}，服务本身是正常的。问题出在浏览器发往 Supabase 的请求被拦截：常见是代理/VPN 不稳定、公司或校园网限制、浏览器扩展拦截，换个网络或关掉代理再试。`;
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError" ? "请求超时（8 秒无响应）" : "域名解析或连接失败";
    return `无法访问 ${host}：${reason}。常见原因是网络/DNS 屏蔽、代理没开、或 NEXT_PUBLIC_SUPABASE_URL 配错。`;
  } finally {
    globalThis.clearTimeout(timer);
  }
}
