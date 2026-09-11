#!/usr/bin/env bash
#
# Hareket adlarını olduğu gibi listeler.
#
# Neden var: hazır programlar program_movements'a hareket ADIYLA bağlanıyor
# (join ... on m.name = '...'). Ad bir harf yanlış yazılırsa o satır sessizce
# eklenmiyor - hata da vermiyor, program eksik kuruluyor. Program yazarken
# adları buradan kopyala, elle yazma.
#
# Kullanım:
#   scripts/movements.sh              tüm kategoriler
#   scripts/movements.sh foundation   tek kategori (slug)
#   scripts/movements.sh --names      sadece adlar (SQL'e yapıştırmak için)
#
# Gereken: psql ve SUPABASE_DB_URL (bkz. scripts/migrate.sh).

set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "HATA: psql bulunamadı. Termux'ta: pkg install postgresql" >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "HATA: SUPABASE_DB_URL boş. ~/.config/calisthenics/db.env dosyasını source et." >&2
  exit 1
fi

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
run_sql() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }

MODE="table"
SLUG=""
for arg in "$@"; do
  case "$arg" in
    --names) MODE="names" ;;
    -*) echo "Bilinmeyen seçenek: $arg" >&2; exit 1 ;;
    *) SLUG="$arg" ;;
  esac
done

FILTER="true"
if [ -n "$SLUG" ]; then
  FILTER="g.slug = '$(printf '%s' "$SLUG" | sed "s/'/''/g")'"
fi

if [ "$MODE" = "names" ]; then
  # Tek sütun, tırnaklı: doğrudan bir values listesine yapıştırılabilir.
  run_sql -At -c "
    select '(''' || m.name || ''', 1, 3, 8, null::int, 60, 1),'
    from public.movements m
    join public.movement_groups g on g.id = m.group_id
    where $FILTER
    order by g.order_index, m.order_index;"
  exit 0
fi

# Hareketin KENDİ ustalık hedefi de yazılıyor: program hedefini ona bakarak
# seçebilesin diye. Program hedefi bağımsızdır, ustalık hedefini ezmez.
run_sql -c "
  select
    g.slug            as kategori,
    m.order_index     as basamak,
    m.name            as hareket,
    coalesce(
      case
        when m.target_type = 'duration' then coalesce(m.target_sets::text || ' set x ', '') || m.target_duration_seconds::text || ' sn'
        when m.target_type = 'reps_sets' then coalesce(m.target_sets::text || ' set x ', '') || m.target_reps::text || ' tekrar'
      end, '-') as ustalik_hedefi
  from public.movements m
  join public.movement_groups g on g.id = m.group_id
  where $FILTER
  order by g.order_index, m.order_index;"
