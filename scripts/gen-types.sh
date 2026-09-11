#!/usr/bin/env bash
#
# src/types/database.types.ts'i veritabanındaki ŞEMADAN üretir.
#
# Neden var: bu dosya elle yazılmıştı. Migration ile tip arasında sessiz bir
# ayrışma riski sürekli açıktı - 0017'de tam bu oldu, yeni RPC Functions
# bloğuna eklenmediği için typecheck patladı. Artık kaynak şemanın kendisi.
#
# Kullanım:
#   scripts/gen-types.sh            dosyayı yeniden üretir
#   scripts/gen-types.sh --check    üretilenle dosya aynı mı (yazmaz, farklıysa 1 döner)
#   scripts/gen-types.sh --stdout   sonucu ekrana basar
#
# Migration uyguladıktan sonra çalıştır, sonra npm run typecheck.
# Gereken: psql, node ve SUPABASE_DB_URL (bkz. scripts/migrate.sh).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/src/types/database.types.ts"

for cmd in psql node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "HATA: $cmd bulunamadı." >&2
    exit 1
  fi
done

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "HATA: SUPABASE_DB_URL boş. ~/.config/calisthenics/db.env dosyasını source et." >&2
  exit 1
fi

export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"

# Tek sorgu, tek JSON. Sütun sırası ordinal_position: üretilen dosya
# tablodaki sırayı koruyor, her çalıştırmada aynı çıktı veriyor.
#
# Eklenti fonksiyonları (pgcrypto vb.) ve trigger fonksiyonları eleniyor:
# ilki bizim değil, ikincisi RPC olarak çağrılmıyor.
read -r -d '' META_SQL <<'SQL' || true
select json_build_object(
  'tables', (
    select coalesce(json_agg(t order by t.name), '[]'::json)
    from (
      select
        c.table_name as name,
        json_agg(
          json_build_object(
            'name', c.column_name,
            'udt', c.udt_name,
            'nullable', c.is_nullable = 'YES',
            'hasDefault', c.column_default is not null
          ) order by c.ordinal_position
        ) as columns
      from information_schema.columns c
      join information_schema.tables tb
        on tb.table_schema = c.table_schema
       and tb.table_name = c.table_name
       and tb.table_type = 'BASE TABLE'
      where c.table_schema = 'public'
      group by c.table_name
    ) t
  ),
  'checks', (
    select coalesce(json_agg(json_build_object(
      'table_name', x.table_name,
      'column_name', x.column_name,
      'def', x.def
    ) order by x.table_name, x.column_name), '[]'::json)
    from (
      select t.relname as table_name, a.attname as column_name, pg_get_constraintdef(k.oid) as def
      from pg_constraint k
      join pg_class t on t.oid = k.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join lateral unnest(k.conkey) as ck(attnum) on true
      join pg_attribute a on a.attrelid = t.oid and a.attnum = ck.attnum
      where k.contype = 'c'
        and n.nspname = 'public'
        and array_length(k.conkey, 1) = 1
    ) x
  ),
  'relationships', (
    select coalesce(json_agg(json_build_object(
      'table_name', r.table_name,
      'name', r.name,
      'columns', r.columns,
      'referencedRelation', r.referenced_relation,
      'referencedColumns', r.referenced_columns
    ) order by r.table_name, r.name), '[]'::json)
    from (
      select
        t.relname as table_name,
        c.conname as name,
        (select json_agg(a.attname order by k.ord)
         from unnest(c.conkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as columns,
        rt.relname as referenced_relation,
        (select json_agg(a.attname order by k.ord)
         from unnest(c.confkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as referenced_columns
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_class rt on rt.oid = c.confrelid
      join pg_namespace rn on rn.oid = rt.relnamespace
      where c.contype = 'f'
        and n.nspname = 'public'
        -- Yalnızca public -> public. auth.users'a giden anahtarlar istemcinin
        -- join tiplerinde kullanılmıyor; elle yazılan dosya da onları saymıyordu.
        and rn.nspname = 'public'
    ) r
  ),
  'views', (
    select coalesce(json_agg(json_build_object('name', table_name) order by table_name), '[]'::json)
    from information_schema.tables
    where table_schema = 'public' and table_type = 'VIEW'
  ),
  'functions', (
    select coalesce(json_agg(json_build_object(
      'name', f.name,
      'args', f.args,
      'result', f.result,
      'comment', f.comment
    ) order by f.name), '[]'::json)
    from (
      select p.proname as name,
             pg_get_function_arguments(p.oid) as args,
             pg_get_function_result(p.oid) as result,
             obj_description(p.oid, 'pg_proc') as comment
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind = 'f'
        and pg_get_function_result(p.oid) <> 'trigger'
        and not exists (
          select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
        )
    ) f
  )
);
SQL

GENERATED="$(psql "$SUPABASE_DB_URL" -At -c "$META_SQL" | node "$ROOT/scripts/gen-types.mjs")"

case "${1:-}" in
  --stdout)
    printf '%s' "$GENERATED"
    ;;
  --check)
    if printf '%s' "$GENERATED" | diff -q - "$TARGET" >/dev/null 2>&1; then
      echo "database.types.ts şemayla uyumlu."
    else
      echo "database.types.ts şemadan FARKLI. 'scripts/gen-types.sh' ile yeniden üret." >&2
      printf '%s' "$GENERATED" | diff -u "$TARGET" - | head -40 >&2 || true
      exit 1
    fi
    ;;
  "")
    printf '%s' "$GENERATED" > "$TARGET"
    echo "Yazıldı: src/types/database.types.ts"
    echo "Şimdi: npm run typecheck"
    ;;
  *)
    echo "Bilinmeyen seçenek: $1" >&2
    exit 1
    ;;
esac
