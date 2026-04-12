import { existsSync } from "node:fs";
import { Database } from "bun:sqlite";

export function openReadOnly(path: string): Database | null {
  if (!existsSync(path)) return null;
  const db = new Database(path, { readonly: true });
  db.exec("PRAGMA query_only = ON;");
  return db;
}
