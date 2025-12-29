const getSetting = (db, key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
};

const listSettings = (db) => {
  return db.prepare('SELECT key, value FROM settings ORDER BY key').all();
};

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);

  return { key, value };
};

const deleteSetting = (db, key) => {
  const info = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  return info.changes > 0;
};

module.exports = {
  getSetting,
  listSettings,
  setSetting,
  deleteSetting,
};
