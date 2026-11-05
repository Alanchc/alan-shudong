type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  error_description?: unknown;
};

const CODE_HINTS: Record<string, string> = {
  "42P01": "数据库表还没创建，请先在 Supabase SQL Editor 执行对应的 SQL 脚本",
  "42703": "数据库缺少字段，请先执行对应的迁移脚本（如 0006_visibility.sql）",
  "42501": "没有操作权限，被 Supabase 的 RLS 策略拦截",
  "23505": "记录已存在（重复操作或用户名已被占用）",
  "23514": "输入内容不符合数据库约束",
  "23503": "关联的数据不存在，请刷新后重试",
};

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;

  if (err && typeof err === "object") {
    const value = err as SupabaseLikeError;
    const raw = typeof value.message === "string" ? value.message : "";
    const code = typeof value.code === "string" ? value.code : "";

    if (/bucket not found/i.test(raw)) {
      return "头像存储桶 avatars 不存在，请先执行 supabase/migrations/0004_profiles.sql";
    }
    if (code && CODE_HINTS[code]) {
      return raw ? `${CODE_HINTS[code]}｜原始错误：${raw}` : CODE_HINTS[code];
    }
    if (raw) return raw;
    if (typeof value.error_description === "string" && value.error_description) {
      return value.error_description;
    }
  }

  return fallback;
}
