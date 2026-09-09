-- Bir kullanıcı için bir günde tek kilo kaydı olsun.
-- Önce varsa mükerrerleri temizle (aynı gün için en son girileni tut).
delete from public.body_weight_logs a
using public.body_weight_logs b
where a.user_id = b.user_id
  and a.logged_at = b.logged_at
  and (a.created_at < b.created_at or (a.created_at = b.created_at and a.id < b.id));

-- upsert'in (onConflict) dayandığı kısıt.
create unique index if not exists body_weight_logs_user_day_idx
  on public.body_weight_logs (user_id, logged_at);
