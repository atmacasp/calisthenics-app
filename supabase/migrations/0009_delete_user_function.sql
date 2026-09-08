-- Hesabı sil: sadece ÇAĞIRAN kullanıcının kendisini siler.
-- Parametre almaz - bir kullanıcı id'si parametre olarak alınsaydı, security
-- definer olduğu için herkes herkesi silebilirdi.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum açılmamış';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public;
revoke all on function public.delete_user() from anon;
grant execute on function public.delete_user() to authenticated;
