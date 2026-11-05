-- 动态点赞（第五轮）
-- 前提：已执行 schema.sql、fix-rls.sql、friends.sql、visibility.sql（需要 entries 与 are_friends）

create table if not exists public.entry_likes (
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

create index if not exists entry_likes_user_idx on public.entry_likes (user_id);

alter table public.entry_likes enable row level security;

drop policy if exists "likes visible with entry" on public.entry_likes;
drop policy if exists "like by self on readable entry" on public.entry_likes;
drop policy if exists "unlike by self" on public.entry_likes;

-- 只能看到自己有权查看的日记上的点赞
create policy "likes visible with entry"
  on public.entry_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.entries e
      where e.id = entry_id
        and (
          e.user_id = auth.uid()
          or e.visibility = 'public'
          or (e.visibility = 'friends' and public.are_friends(auth.uid(), e.user_id))
        )
    )
  );

-- 只能以自己的身份点赞，且目标日记对自己可见
create policy "like by self on readable entry"
  on public.entry_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.entries e
      where e.id = entry_id
        and (
          e.user_id = auth.uid()
          or e.visibility = 'public'
          or (e.visibility = 'friends' and public.are_friends(auth.uid(), e.user_id))
        )
    )
  );

-- 只能取消自己的点赞
create policy "unlike by self"
  on public.entry_likes for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.entry_likes to authenticated;

-- 校验：应为 3 条策略
select policyname, cmd, roles
from pg_policies
where tablename = 'entry_likes'
order by policyname;
