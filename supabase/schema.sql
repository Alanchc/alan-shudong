-- 日记站 · Supabase 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 里整段执行

create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content_md text not null default '',
  entry_date date not null default current_date,
  mood text not null default '平静'
    check (mood in ('开心', '平静', '低落', '疲惫', '兴奋')),
  tags text[] not null default '{}',
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_user_created_idx
  on public.entries (user_id, created_at desc);

create index if not exists entries_share_slug_idx
  on public.entries (share_slug) where share_slug is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

-- 权限：默认拒绝一切，再按策略放行
alter table public.entries enable row level security;
revoke all on public.entries from anon, authenticated;
grant select, insert, update, delete on public.entries to authenticated;

-- 读：自己的全部，或别人公开分享的那一篇
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

-- 图片存储桶（P2 使用，先建好）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-images',
  'entry-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "read own images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "upload own images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "delete own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
