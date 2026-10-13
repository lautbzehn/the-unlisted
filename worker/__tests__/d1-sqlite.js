/**
 * A minimal Cloudflare D1 stand-in backed by Node's built-in SQLite, for testing the store's SQL against
 * the real migrations. Implements only the calls the store uses; `batch` runs as one transaction, like D1.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function createD1(migrationsDir) {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
  }
  const run = (sql, args) => {
    const stmt = sqlite.prepare(sql);
    if (/^\s*(SELECT|WITH)|RETURNING/i.test(sql)) return { results: stmt.all(...args), meta: { changes: 0 } };
    const info = stmt.run(...args);
    return { results: [], meta: { changes: Number(info.changes) } };
  };
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => run(sql, args).results[0] ?? null,
    all: async () => run(sql, args),
    run: async () => run(sql, args),
    exec: () => run(sql, args),
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const out = statements.map((s) => s.exec());
        sqlite.exec('COMMIT');
        return out;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
