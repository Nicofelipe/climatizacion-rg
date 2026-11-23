/**
 * Aplica en orden las migraciones de database/migrations y las registra en dbo.SchemaMigration.
 *   npm run migrate              aplica las pendientes
 *   npm run migrate -- --status  solo muestra el estado, sin cambiar nada
 *   npm run migrate -- --create  crea la base si no existe (instalación nueva)
 * En una base anterior a este registro, las migraciones 001 a 013 se dan por aplicadas.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { executeBatch } from './sqlServer';

const folder = process.env.MIGRATIONS_DIR ?? path.resolve(__dirname, '../../../database/migrations');
const seeds = path.resolve(folder, '../seeds');
const BASELINE = 13;

type Row = Record<string, unknown>;

function run(sql: string, database?: string): Promise<Row[]> {
  return executeBatch(sql, { database, admin: true });
}

/** Separa por GO y descarta USE: la base la decide DB_DATABASE. */
export function batches(sql: string) {
  return sql.replace(/^﻿/, '').split(/^\s*GO\s*;?\s*$/gim)
    .map(part => part.replace(/^\s*USE\s+\[?\w+\]?\s*;?\s*$/gim, '').trim())
    .filter(Boolean);
}

export function migrationFiles(directory = folder) {
  return fs.readdirSync(directory).filter(name => /^\d{3}_.+\.sql$/.test(name)).sort();
}

async function runFile(file: string) {
  for (const part of batches(fs.readFileSync(file, 'utf8'))) {
    try { await run(part); }
    catch (error) { throw new Error(`${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`); }
  }
}

async function main() {
  const database = process.env.DB_DATABASE;
  if (!database || !/^\w+$/.test(database)) throw new Error('DB_DATABASE no está configurada o no es válida.');
  if (process.argv.includes('--create')) await run(`IF DB_ID(N'${database}') IS NULL CREATE DATABASE [${database}];`, 'master');

  const [state] = await run(`SELECT CASE WHEN OBJECT_ID('dbo.Expense','U') IS NULL THEN 0 ELSE 1 END AS HasSchema,
    CASE WHEN OBJECT_ID('dbo.SchemaMigration','U') IS NULL THEN 0 ELSE 1 END AS HasLog;`);
  const files = migrationFiles();
  const applied = new Set<string>();
  if (state.HasLog) for (const row of await run('SELECT Name FROM dbo.SchemaMigration;')) applied.add(String(row.Name));
  else if (state.HasSchema) for (const name of files) if (Number(name.slice(0, 3)) <= BASELINE) applied.add(name);
  const pending = files.filter(name => !applied.has(name) && !name.startsWith('001_'));

  if (process.argv.includes('--status')) {
    console.log(`Base ${database}: ${applied.size} migraciones registradas, ${pending.length} pendientes.`);
    for (const name of pending) console.log(`  pendiente  ${name}`);
    return;
  }
  if (!state.HasLog) {
    await run('CREATE TABLE dbo.SchemaMigration(Name nvarchar(100) NOT NULL CONSTRAINT PK_SchemaMigration PRIMARY KEY, AppliedAt datetime2(0) NOT NULL CONSTRAINT DF_SchemaMigration_AppliedAt DEFAULT SYSUTCDATETIME());');
    for (const name of applied) await run(`INSERT INTO dbo.SchemaMigration(Name) VALUES(N'${name}');`);
  }
  for (const name of pending) {
    // Los catálogos base deben existir antes de la primera migración que depende de ellos.
    if (name.startsWith('014_') && !state.HasSchema) {
      for (const seed of fs.readdirSync(seeds).sort()) await runFile(path.join(seeds, seed));
    }
    await runFile(path.join(folder, name));
    await run(`INSERT INTO dbo.SchemaMigration(Name) VALUES(N'${name}');`);
    console.log(`aplicada  ${name}`);
  }
  console.log(pending.length ? 'Base actualizada.' : 'La base ya estaba al día.');
}

if (require.main === module) {
  // Las conexiones abiertas no deben mantener vivo el proceso al terminar.
  main().then(() => process.exit(0), error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
