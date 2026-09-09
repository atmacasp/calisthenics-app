#!/usr/bin/env bash
#
# Supabase migration uygulayıcı.
#
# Neden var: migration'ları elle SQL Editor'e yapıştırmak iki şeyi kaybettiriyor -
# hangi dosyanın uygulandığı kaydını, ve dosyanın gerçekten commit edilip
# edilmediğini. 0015'te tam olarak bu oldu: dosya "begin;" ile açıldı ama sondaki
# "commit;" yapıştırılmayınca her şey sessizce geri alındı, hata da görünmedi.
#
# Bu script her dosyayı TEK transaction'da çalıştırır ve ancak başarılı olursa
# migrations.applied tablosuna yazar. Dolayısıyla migration dosyaları KENDİ
# transaction'ını açmaz - dosyalara begin/commit yazma, işi script yapıyor.
#
# Kullanım:
#   scripts/migrate.sh                       bekleyen migration'ları sırayla uygular
#   scripts/migrate.sh --status              hangisi uygulanmış, hangisi bekliyor
#   scripts/migrate.sh --baseline 0014_avatar_storage.sql
#                                            bu dosyayı ve öncesini "zaten
#                                            uygulanmış" diye işaretler (ilk kurulum)
#
# Gereken: psql (pkg install postgresql) ve SUPABASE_DB_URL ortam değişkeni.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if ! command -v psql >/dev/null 2>&1; then
  echo "HATA: psql bulunamadı. Termux'ta: pkg install postgresql" >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "HATA: SUPABASE_DB_URL boş." >&2
  echo "Supabase Dashboard > Connect > Session pooler URI'sini" >&2
  echo "~/.config/calisthenics/db.env içine koyup .bashrc'den source et." >&2
  exit 1
fi

# "schema already exists, skipping" gibi NOTICE'ler her çalıştırmada ekranı
# dolduruyor; uyarı ve hatalar görünmeye devam ediyor.
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"

# SUPABASE_DB_URL parola içerir; hiçbir yerde ekrana basılmıyor.
run_sql() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }

# Kayıt tablosu bilerek "migrations" şemasında: public'te olsaydı PostgREST
# üzerinden REST API'ye de açılırdı.
run_sql \
  -c "create schema if not exists migrations;" \
  -c "create table if not exists migrations.applied (
        version text primary key,
        applied_at timestamptz not null default now()
      );"

is_applied() {
  local found
  found="$(run_sql -At -c "select 1 from migrations.applied where version = '$1'")"
  [ -n "$found" ]
}

case "${1:-}" in
  --status)
    for file in "$MIGRATIONS_DIR"/*.sql; do
      version="$(basename "$file")"
      if is_applied "$version"; then
        echo "  uygulandı   $version"
      else
        echo "  BEKLİYOR    $version"
      fi
    done
    exit 0
    ;;

  --baseline)
    upto="${2:-}"
    if [ -z "$upto" ]; then
      echo "HATA: --baseline <dosya adı>" >&2
      exit 1
    fi
    for file in "$MIGRATIONS_DIR"/*.sql; do
      version="$(basename "$file")"
      run_sql -c "insert into migrations.applied (version) values ('$version') on conflict do nothing;"
      echo "  işaretlendi $version"
      if [ "$version" = "$upto" ]; then
        break
      fi
    done
    exit 0
    ;;

  "")
    ;;

  *)
    echo "Bilinmeyen seçenek: $1" >&2
    exit 1
    ;;
esac

applied_count=0
for file in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$file")"
  if is_applied "$version"; then
    continue
  fi

  # Emniyet: dosya kendi transaction'ını açarsa --single-transaction ile çakışır
  # ve eksik bir commit her şeyi sessizce geri aldırabilir.
  if grep -qiE '^[[:space:]]*(begin|commit|rollback)[[:space:]]*;' "$file"; then
    echo "HATA: $version kendi transaction'ını yönetiyor (begin/commit/rollback)." >&2
    echo "Bu script her dosyayı zaten tek transaction'da çalıştırıyor; o satırları sil." >&2
    exit 1
  fi

  echo "-> $version uygulanıyor..."
  # Dosya ve kayıt satırı aynı transaction'da: "yarısı uygulandı ama kaydı yok"
  # durumu oluşamaz. Hata olursa ON_ERROR_STOP + set -e burada durdurur.
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q --single-transaction \
    -f "$file" \
    -c "insert into migrations.applied (version) values ('$version');"
  echo "   tamam"
  applied_count=$((applied_count + 1))
done

if [ "$applied_count" -eq 0 ]; then
  echo "Bekleyen migration yok."
else
  echo "$applied_count migration uygulandı."
fi
