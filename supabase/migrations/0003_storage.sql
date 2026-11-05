-- 日记站 · 图片存储初始化（可重复执行）
-- 用法：Supabase Dashboard → SQL Editor → 新建查询 → 整段粘贴 → Run

-- 1. 存储桶：公开读取（图片地址是随机 UUID，不可枚举），仅本人可上传/删除
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-images',
  'entry-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. 上传：只能写到自己 uid 目录下
drop policy if exists "upload own images" on storage.objects;
create policy "upload own images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. 删除：只能删自己目录下的
drop policy if exists "delete own images" on storage.objects;
create policy "delete own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. 校验
select id, name, public, file_size_limit
from storage.buckets
where id = 'entry-images';

select policyname, cmd
from pg_policies
where tablename = 'objects' and policyname like '%images%'
order by policyname;
