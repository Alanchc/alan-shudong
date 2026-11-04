-- 通知与管理员（第六轮）
-- 前提：已执行 profiles.sql（需要 profiles 表）
-- 执行后在文件末尾把 'alan' 改成你自己的用户名，用于初始化第一个管理员

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 判断某个用户是不是管理员；security definer 绕过 admins 表的 RLS，避免策略递归
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = uid);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

alter table public.admins enable row level security;

drop policy if exists "admins readable" on public.admins;
drop policy if exists "admins grant by admin" on public.admins;
drop policy if exists "admins revoke by admin" on public.admins;

create policy "admins readable"
  on public.admins for select
  to authenticated
  using (true);

create policy "admins grant by admin"
  on public.admins for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

-- 管理员可以取消其他人，但不能取消自己，保证系统里至少留有一个管理员
create policy "admins revoke by admin"
  on public.admins for delete
  to authenticated
  using (public.is_admin(auth.uid()) and user_id <> auth.uid());

grant select, insert, delete on public.admins to authenticated;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements readable" on public.announcements;
drop policy if exists "announcements insert by admin" on public.announcements;
drop policy if exists "announcements delete by admin" on public.announcements;

-- 所有登录用户都能看到全部通知
create policy "announcements readable"
  on public.announcements for select
  to authenticated
  using (true);

create policy "announcements insert by admin"
  on public.announcements for insert
  to authenticated
  with check (public.is_admin(auth.uid()) and author_id = auth.uid());

create policy "announcements delete by admin"
  on public.announcements for delete
  to authenticated
  using (public.is_admin(auth.uid()));

grant select, insert, delete on public.announcements to authenticated;

-- 首个管理员：把 'alan' 换成你自己的用户名（可在「我的」页看到）
insert into public.admins (user_id)
select id from public.profiles where username = 'alan'
on conflict (user_id) do nothing;

-- 校验：应看到 admins 1 条、announcements 0 条、策略若干
select 'admins' as table_name, count(*) as rows from public.admins
union all
select 'announcements', count(*) from public.announcements;

select tablename, policyname, cmd
from pg_policies
where tablename in ('admins', 'announcements')
order by tablename, policyname;
