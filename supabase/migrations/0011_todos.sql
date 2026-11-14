-- 任务清单：轻量待办，仅本人可见
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  done boolean not null default false,
  done_at timestamptz,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todo_body_len check (char_length(body) between 1 and 500)
);

create index if not exists todos_owner_idx
  on public.todos (user_id, done, due_date);
create index if not exists todos_done_idx
  on public.todos (user_id, done_at);

alter table public.todos enable row level security;

drop policy if exists "todos owner read" on public.todos;
drop policy if exists "todos owner write" on public.todos;
drop policy if exists "todos owner update" on public.todos;
drop policy if exists "todos owner delete" on public.todos;

create policy "todos owner read"
  on public.todos for select
  to authenticated
  using (user_id = auth.uid());

create policy "todos owner write"
  on public.todos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "todos owner update"
  on public.todos for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "todos owner delete"
  on public.todos for delete
  to authenticated
  using (user_id = auth.uid());
