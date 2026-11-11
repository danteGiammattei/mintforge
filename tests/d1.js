/* A D1 look-alike over node:sqlite, so the server code runs in tests
 * exactly as written: prepare().bind().first()/all()/run() and batch(). */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  _prep() { return this.db.prepare(this.sql); }
  // D1 lets ?1 appear many times; node:sqlite wants one value per distinct index
  async first() { return this._prep().get(...this.args) ?? null; }
  async all()   { return { results: this._prep().all(...this.args) }; }
  async run()   { const r = this._prep().run(...this.args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
}

export function makeDb(schemaFiles = ["schema.sql"]) {
  const db = new DatabaseSync(":memory:");
  for (const f of schemaFiles) db.exec(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
  return {
    raw: db,
    prepare: sql => new Stmt(db, sql),
    async batch(stmts) {
      db.exec("BEGIN");
      try { const out = []; for (const s of stmts) out.push(await s.run()); db.exec("COMMIT"); return out; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}

/* A deterministic stand-in for cryptoRand. */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
/* Returns the listed values in order, then 0.5 forever. */
export const scripted = (...vals) => { let i = 0; return () => (i < vals.length ? vals[i++] : 0.5); };
