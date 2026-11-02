type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  error_description?: unknown;
};

const CODE_HINTS: Record<string, string> = {
  "42P01": "数据库表还没创建，请先在 Supabase SQL Editor 执行 supabase/profiles.sql",
  "42501": "没有操作权限，请检查 Supabase 的 RLS 策略",
  "23505": "这个用户名已经被占用了",
  "23514": "输入内容不符合格式要求",
};

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;

  if (err && typeof err === "object") {
    const value = err as SupabaseLikeError;
    if (typeof value.code === "string" && CODE_HINTS[value.code]) {
      return CODE_HINTS[value.code];
    }
    if (typeof value.message === "string" && value.message) {
      if (/bucket not found/i.test(value.message)) {
        return "头像存储桶 avatars 不存在，请先执行 supabase/profiles.sql";
      }
      return value.message;
    }
    if (typeof value.error_description === "string" && value.error_description) {
      return value.error_description;
    }
  }

  return fallback;
}
