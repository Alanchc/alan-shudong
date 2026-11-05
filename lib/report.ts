import * as Sentry from "@sentry/nextjs";

// 这些是业务预期内的失败（重复操作、无权限、登录过期等），上报只会淹没真正的问题
const IGNORED_CODES = new Set([
  "23505",
  "42501",
  "PGRST116",
  "PGRST301",
  "invalid_credentials",
  "email_not_confirmed",
  "over_email_send_rate_limit",
  "user_already_exists",
]);

const IGNORED_MESSAGES = new Set(["请先登录", "登录已过期，请重新登录"]);

export function reportError(err: unknown) {
  if (!Sentry.isEnabled()) return;

  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && IGNORED_CODES.has(code)) return;
  }

  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (message && IGNORED_MESSAGES.has(message)) return;

  Sentry.captureException(err);
}
