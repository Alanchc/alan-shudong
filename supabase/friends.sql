-- 好友关系（第二轮：加好友）
-- 一条记录代表一对好友关系，status: pending（待同意）/ accepted（已同意）

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id),
  constraint friendship_status check (status in ('pending', 'accepted'))
);

-- 同一对用户只允许存在一条关系，反方向也不能重复申请
create unique index if not exists friendships_pair_uniq
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

drop policy if exists "friendship visible to both" on public.friendships;
drop policy if exists "friendship request by self" on public.friendships;
drop policy if exists "friendship update by both" on public.friendships;
drop policy if exists "friendship delete by both" on public.friendships;

-- 只有关系双方能看到这条记录
create policy "friendship visible to both"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- 只能以自己为申请人发起，且初始状态必须是待同意
create policy "friendship request by self"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

-- 双方都可以更新（接收方同意、申请方也可撤回）
create policy "friendship update by both"
  on public.friendships for update
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

-- 双方都可以删除（拒绝 / 取消 / 删除好友）
create policy "friendship delete by both"
  on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- 供后续「仅好友可见」的日记权限判断使用
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
