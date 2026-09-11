/**
 * Şema metadata'sını (stdin'den JSON) src/types/database.types.ts'e çevirir.
 *
 * Bunu scripts/gen-types.sh çağırıyor; tek başına çalıştırılmaz.
 *
 * Neden var: database.types.ts elle yazılmıştı ve migration ile tip arasında
 * sessiz bir ayrışma riski sürekli açıktı - 0017'de tam bu oldu, yeni RPC
 * Functions bloğuna eklenmediği için typecheck patladı.
 */

/**
 * Makinenin bilemeyeceği, insan tarafından daraltılmış tipler.
 *
 * jsonb bir argümanın gerçekte "gün -> gün" eşlemesi olduğunu şema söylemiyor.
 * Üretici burada duruyor ve elle konmuş tipi koruyor; yeni bir daraltma
 * gerekirse buraya bir satır eklenir, üretilen dosya elle düzeltilmez.
 */
const OVERRIDES = {
  "functions.remap_program_days.args.p_map": "Record<string, number>",
};

/** Postgres iç tip adı -> TypeScript. Bilinmeyen tip string'e düşüyor. */
const TYPE_MAP = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  citext: "string",
  name: "string",
  date: "string",
  time: "string",
  timetz: "string",
  timestamp: "string",
  timestamptz: "string",
  interval: "string",
  bytea: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  numeric: "number",
  float4: "number",
  float8: "number",
  bool: "boolean",
  json: "Json",
  jsonb: "Json",
  void: "undefined",
  record: "unknown",
};

function tsType(udt) {
  if (udt.startsWith("_")) {
    const inner = TYPE_MAP[udt.slice(1)] ?? "string";
    return `${inner}[]`;
  }
  return TYPE_MAP[udt] ?? "string";
}

/**
 * Check kısıtındaki metin sabitlerini birlik tipine çevirir.
 *
 * "CHECK ((level = ANY (ARRAY['beginner'::text, ...])))" -> "beginner" | ...
 * Sayı aralıkları ("day_of_week >= 1 AND <= 7") metin sabiti içermediği için
 * doğal olarak eleniyor - onlar tip değil, kural.
 */
function unionFromCheck(def) {
  if (!def.includes("= ANY (ARRAY[") && !/\bIN \(/.test(def)) return null;
  const literals = [...def.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  if (literals.length === 0) return null;
  const unique = [...new Set(literals)];
  return unique.map((v) => `"${v}"`).join(" | ");
}

/** Fonksiyon argüman listesini ("p_id uuid, p_map jsonb") nesne tipine çevirir. */
function argsType(fnName, args) {
  const trimmed = (args ?? "").trim();
  if (trimmed === "") return "Record<string, never>";

  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const fields = parts.map((part) => {
    const tokens = part.split(/\s+/);
    // "OUT value text" gibi yön belirteçlerini at.
    while (tokens.length > 1 && /^(in|out|inout|variadic)$/i.test(tokens[0])) tokens.shift();
    const name = tokens.shift() ?? "arg";
    const udtName = tokens.join(" ").replace(/\s+DEFAULT\s+.*$/i, "").trim();
    const override = OVERRIDES[`functions.${fnName}.args.${name}`];
    return `${name}: ${override ?? tsType(normalizeSqlType(udtName))}`;
  });
  return `{ ${fields.join("; ")} }`;
}

/** "character varying(20)" gibi SQL yazımını iç tip adına indirger. */
function normalizeSqlType(sql) {
  const s = sql.toLowerCase().replace(/\(.*\)/, "").replace(/\[\]$/, "").trim();
  const table = {
    "character varying": "varchar",
    character: "bpchar",
    "double precision": "float8",
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "time with time zone": "timetz",
    "time without time zone": "time",
    integer: "int4",
    smallint: "int2",
    bigint: "int8",
    boolean: "bool",
    real: "float4",
  };
  const base = table[s] ?? s;
  return sql.trim().endsWith("[]") ? `_${base}` : base;
}

function indent(level) {
  return "  ".repeat(level);
}

function main(meta) {
  const out = [];
  out.push("// ÜRETİLEN DOSYA - elle düzenleme.");
  out.push("// scripts/gen-types.sh veritabanındaki şemadan yeniden üretir.");
  out.push("// Daraltılmış tipler (ör. jsonb -> Record<...>) scripts/gen-types.mjs");
  out.push("// içindeki OVERRIDES tablosunda tutuluyor.");
  out.push("");
  out.push("export type Json =");
  out.push("  | string");
  out.push("  | number");
  out.push("  | boolean");
  out.push("  | null");
  out.push("  | { [key: string]: Json | undefined }");
  out.push("  | Json[];");
  out.push("");
  out.push("export interface Database {");
  out.push(`${indent(1)}public: {`);
  out.push(`${indent(2)}Tables: {`);

  for (const table of meta.tables) {
    const unions = {};
    for (const check of meta.checks.filter((c) => c.table_name === table.name)) {
      const union = unionFromCheck(check.def);
      if (union) unions[check.column_name] = union;
    }

    const typeOf = (col) => unions[col.name] ?? tsType(col.udt);

    out.push(`${indent(3)}${table.name}: {`);

    out.push(`${indent(4)}Row: {`);
    for (const col of table.columns) {
      out.push(`${indent(5)}${col.name}: ${typeOf(col)}${col.nullable ? " | null" : ""};`);
    }
    out.push(`${indent(4)}};`);

    // Insert: varsayılanı olan ya da null kabul eden sütun opsiyonel.
    out.push(`${indent(4)}Insert: {`);
    for (const col of table.columns) {
      const optional = col.hasDefault || col.nullable;
      out.push(`${indent(5)}${col.name}${optional ? "?" : ""}: ${typeOf(col)}${col.nullable ? " | null" : ""};`);
    }
    out.push(`${indent(4)}};`);

    out.push(`${indent(4)}Update: Partial<Database["public"]["Tables"]["${table.name}"]["Insert"]>;`);

    // Relationships da Views gibi şart: supabase-js'in GenericTable kısıtı bunu
    // bekliyor, yoksa tablo "never"a düşüyor. İstemci ayrıca gömülü select'lerin
    // (select("*, movements(...)")) tipini buradan çıkarıyor.
    const rels = (meta.relationships ?? []).filter((r) => r.table_name === table.name);
    if (rels.length === 0) {
      out.push(`${indent(4)}Relationships: [];`);
    } else {
      out.push(`${indent(4)}Relationships: [`);
      rels.forEach((rel, i) => {
        const cols = rel.columns.map((c) => `"${c}"`).join(", ");
        const refCols = rel.referencedColumns.map((c) => `"${c}"`).join(", ");
        out.push(`${indent(5)}{`);
        out.push(`${indent(6)}foreignKeyName: "${rel.name}";`);
        out.push(`${indent(6)}columns: [${cols}];`);
        out.push(`${indent(6)}referencedRelation: "${rel.referencedRelation}";`);
        out.push(`${indent(6)}referencedColumns: [${refCols}];`);
        out.push(`${indent(5)}}${i === rels.length - 1 ? "" : ","}`);
      });
      out.push(`${indent(4)}];`);
    }

    out.push(`${indent(3)}};`);
  }

  out.push(`${indent(2)}};`);

  // Views şart: supabase-js'in Database tipi bu anahtar olmadan GenericSchema
  // kısıtını sağlamıyor ve İSTEMCİDEKİ HER TABLO "never"a düşüyor - tablolar
  // doğru üretilmiş olsa bile. (Bir kez atlandı, 69 typecheck hatası verdi.)
  // Projede view yok; çıkarsa üretici burada duruyor, sessizce yanlış tip
  // üretmektense insanı çağırıyor.
  if (meta.views && meta.views.length > 0) {
    const names = meta.views.map((v) => v.name).join(", ");
    console.error(`HATA: public şemasında view var (${names}). gen-types.mjs view üretmiyor.`);
    process.exit(1);
  }
  out.push(`${indent(2)}Views: {`);
  out.push(`${indent(3)}[_ in never]: never;`);
  out.push(`${indent(2)}};`);

  out.push(`${indent(2)}Functions: {`);
  for (const fn of meta.functions) {
    // Fonksiyonun veritabanındaki açıklaması (comment on function ...) varsa
    // JSDoc olarak geçiyor: dokümantasyon da şemadan geliyor, elle tutulmuyor.
    if (fn.comment) {
      const oneLine = fn.comment.replace(/\s+/g, " ").trim();
      out.push(`${indent(3)}/** ${oneLine} */`);
    }
    out.push(`${indent(3)}${fn.name}: {`);
    out.push(`${indent(4)}Args: ${argsType(fn.name, fn.args)};`);
    out.push(`${indent(4)}Returns: ${tsType(normalizeSqlType(fn.result))};`);
    out.push(`${indent(3)}};`);
  }
  out.push(`${indent(2)}};`);
  out.push(`${indent(2)}Enums: {`);
  out.push(`${indent(3)}[_ in never]: never;`);
  out.push(`${indent(2)}};`);
  out.push(`${indent(2)}CompositeTypes: {`);
  out.push(`${indent(3)}[_ in never]: never;`);
  out.push(`${indent(2)}};`);
  out.push(`${indent(1)}};`);
  out.push("}");
  out.push("");

  return out.join("\n");
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let meta;
  try {
    meta = JSON.parse(input);
  } catch (error) {
    console.error("HATA: şema metadata'sı okunamadı (psql çıktısı JSON değil).");
    process.exit(1);
  }
  process.stdout.write(main(meta));
});
