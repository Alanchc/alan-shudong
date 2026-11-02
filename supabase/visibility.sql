-- 日记三档可见性（第四轮）：private 私密 / friends 仅好友 / public 公开
-- 前提：已执行 schema.sql、fix-rls.sql、friends.sql（需要 are_friends）

-- 1. 新增 visibility 字段并回填旧数据
alter table public.entries add column if not exists visibility text;

update public.entries
set visibility = case when is_public then 'public' else 'private' end
where visibility is null;

alter table public.entries alter column visibility set default 'private';
alter table public.entries alter column visibility set not null;

alter table public.entries drop constraint if exists entries_visibility_check;
alter table public.entries add constraint entries_visibility_check
  check (visibility in ('private', 'friends', 'public'));

create index if not exists entries_visibility_date_idx
  on public.entries (visibility, entry_date desc);

-- 2. 旧策略引用了 is_public，先删掉才能改列
drop policy if exists "read own or shared" on public.entries;
drop policy if exists "read public entries" on public.entries;
drop policy if exists "read own or friends or public" on public.entries;

-- 3. 把 is_public 改成由 visibility 派生的生成列
--    这样旧代码（分享页、列表页）读取 is_public 仍然成立，但不再单独写入
alter table public.entries drop column if exists is_public;
alter table public.entries
  add column is_public boolean generated always as (visibility = 'public') stored;

-- 4. 读权限
--    匿名：只能看公开的
create policy "read public entries"
  on public.entries for select
  to anon
  using (visibility = 'public');

--    登录用户：自己的全部 + 别人的公开 + 好友的「仅好友」
create policy "read own or friends or public"
  on public.entries for select
  to authenticated
  using (
    user_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'friends' and public.are_friends(auth.uid(), user_id))
  );

grant select on public.entries to anon;
grant select, insert, update, delete on public.entries to authenticated;

-- 校验：应为 5 条策略（含原有的 insert/update/delete），且 visibility 默认 private
select policyname, cmd, roles
from pg_policies
where tablename = 'entries'
order by policyname;
