-- 一对一聊天（第三轮）
-- 前提：已执行 friends.sql（发送消息需要 are_friends 判断）

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  recalled_at timestamptz,
  read_at timestamptz,
  constraint no_self_message check (sender_id <> receiver_id),
  constraint message_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists messages_pair_idx
  on public.messages (sender_id, receiver_id, created_at);
create index if not exists messages_unread_idx
  on public.messages (receiver_id, read_at);

alter table public.messages enable row level security;
alter table public.messages replica identity full;

drop policy if exists "messages visible to both" on public.messages;
drop policy if exists "messages send to friend" on public.messages;
drop policy if exists "messages recall own" on public.messages;
drop policy if exists "messages mark read" on public.messages;

-- 只有收发双方能看到消息
create policy "messages visible to both"
  on public.messages for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- 只能以自己名义发给好友
create policy "messages send to friend"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.are_friends(sender_id, receiver_id)
  );

-- 本人可在 2 分钟内撤回，且只能把 recalled_at 置为非空
create policy "messages recall own"
  on public.messages for update
  to authenticated
  using (
    sender_id = auth.uid()
    and recalled_at is null
    and created_at > now() - interval '2 minutes'
  )
  with check (
    sender_id = auth.uid()
    and recalled_at is not null
  );

-- 接收方可以标记已读
create policy "messages mark read"
  on public.messages for update
  to authenticated
  using (receiver_id = auth.uid() and read_at is null)
  with check (receiver_id = auth.uid());

-- 加入实时订阅（重复执行不会报错）
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
