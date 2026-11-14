-- 备忘录：快速记录，仅本人可见
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memo_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists memos_owner_idx
  on public.memos (user_id, pinned desc, updated_at desc);

alter table public.memos enable row level security;

drop policy if exists "memos owner read" on public.memos;
drop policy if exists "memos owner write" on public.memos;
drop policy if exists "memos owner update" on public.memos;
drop policy if exists "memos owner delete" on public.memos;

create policy "memos owner read"
  on public.memos for select
  to authenticated
  using (user_id = auth.uid());

create policy "memos owner write"
  on public.memos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "memos owner update"
  on public.memos for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "memos owner delete"
  on public.memos for delete
  to authenticated
  using (user_id = auth.uid());
