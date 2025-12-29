const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.task-manager');
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, 'task-manager.db');
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const getDbPath = (overridePath) => {
  if (overridePath) {
    return overridePath;
  }

  const envPath = process.env.TASK_MANAGER_DB_PATH;
  if (envPath) {
    return envPath;
  }

  return DEFAULT_DB_PATH;
};

const getMigrationsDir = (overridePath) => {
  if (overridePath) {
    return overridePath;
  }

  return DEFAULT_MIGRATIONS_DIR;
};

const ensureMigrationsTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
};

const readMigrationFiles = (migrationsDir) => {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
};

const getAppliedMigrations = (db) => {
  const rows = db.prepare('SELECT id FROM migrations').all();
  return new Set(rows.map((row) => row.id));
};

const runMigrations = (db, migrationsDir) => {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);
  const files = readMigrationFiles(migrationsDir);

  files.forEach((file) => {
    if (applied.has(file)) {
      return;
    }

    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString()
      );
    });

    apply();
  });
};

const openDb = (options = {}) => {
  const dbPath = getDbPath(options.dbPath);
  const migrationsDir = getMigrationsDir(options.migrationsDir);

  ensureDir(path.dirname(dbPath));
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  runMigrations(db, migrationsDir);

  return db;
};

module.exports = {
  openDb,
  runMigrations,
  DEFAULT_DB_PATH,
  DEFAULT_MIGRATIONS_DIR,
};
