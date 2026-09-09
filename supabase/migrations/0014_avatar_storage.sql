-- 0014: Profil fotoğrafı — storage bucket'ı, erişim kuralları ve profiles.avatar_url
--
-- Fotoğrafın kendisi Postgres'te değil Supabase Storage'da (S3 uyumlu disk)
-- durur; tabloda sadece görselin URL'si tutulur. Bir tabloya bytea olarak
-- koymak satırları şişirir ve her profil okumasında görseli de indirtir.
--
-- Bucket PUBLIC seçildi: profil fotoğrafı uygulamanın içinde zaten gösterilen
-- bir şey, public bucket'ta okuma imzalı URL istemeden çalışır ve CDN'de
-- önbelleklenir. Karşılığında dosya yolu tahmin edilebilir (<user_id>/avatar.jpg),
-- yani gizli kalması gereken bir görsel buraya konulmamalı. Gizlilik gerekirse
-- public'i false yapıp okuma tarafında createSignedUrl'e geçmek yeterli;
-- aşağıdaki yazma kuralları aynen geçerli kalır.

-- 1) Tabloya URL kolonu.
alter table public.profiles
  add column if not exists avatar_url text;

-- 2) Bucket. Boyut ve mime sınırı SUNUCUDA zorlanır; istemcinin kontrolüne
--    güvenmek zorunda değiliz.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Erişim kuralları.
--    storage.objects.name = "<user_id>/avatar.jpg" olduğu için
--    (storage.foldername(name))[1] dosyanın sahibinin id'sini verir.
--    Herkes okuyabilir, ama herkes SADECE kendi klasörüne yazabilir.
drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Hesap silinince fotoğraf da diskte kalmasın.
--    auth.users silindiğinde profiles satırı cascade ile gidiyor ama storage
--    nesneleri Postgres'in cascade zincirinde değil - elle silinmeli.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum açılmamış';
  end if;

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public;
revoke all on function public.delete_user() from anon;
grant execute on function public.delete_user() to authenticated;
