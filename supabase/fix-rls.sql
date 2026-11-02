-- 日记站 · 权限修复脚本（可重复执行）
-- 用法：Supabase Dashboard → SQL Editor → 新建查询 → 整段粘贴 → Run

alter table public.entries enable row level security;

-- 表级权限：登录用户可读写自己的行；匿名用户只能读（分享页需要）
grant select on public.entries to anon;
grant select, insert, update, delete on public.entries to authenticated;

-- 重建策略（先删再加，保证状态干净）
drop policy if exists "read own or shared" on public.entries;
drop policy if exists "insert own" on public.entries;
drop policy if exists "update own" on public.entries;
drop policy if exists "delete own" on public.entries;

create policy "read own or shared"
  on public.entries for select
  to authenticated, anon
  using (
    user_id = auth.uid()
    or (is_public = true and share_slug is not null)
  );

create policy "insert own"
  on public.entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "update own"
  on public.entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "delete own"
  on public.entries for delete
  to authenticated
  using (user_id = auth.uid());

-- 校验：第一列应为 true，第二块应列出 4 条策略
select relrowsecurity as rls_enabled
from pg_class
where relname = 'entries';

select policyname, cmd, roles
from pg_policies
where tablename = 'entries'
order by policyname;
