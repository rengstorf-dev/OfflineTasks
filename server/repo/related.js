const listRelated = (db) => {
  return db.prepare('SELECT task_id, related_id FROM related_tasks').all();
};

const listRelatedForTask = (db, taskId) => {
  return db
    .prepare('SELECT task_id, related_id FROM related_tasks WHERE task_id = ?')
    .all(taskId);
};

const addRelated = (db, taskId, relatedId) => {
  db.prepare(
    'INSERT OR IGNORE INTO related_tasks (task_id, related_id) VALUES (?, ?)'
  ).run(taskId, relatedId);
};

const removeRelated = (db, taskId, relatedId) => {
  const info = db
    .prepare('DELETE FROM related_tasks WHERE task_id = ? AND related_id = ?')
    .run(taskId, relatedId);
  return info.changes > 0;
};

const clearRelatedForTask = (db, taskId) => {
  const info = db
    .prepare('DELETE FROM related_tasks WHERE task_id = ? OR related_id = ?')
    .run(taskId, taskId);
  return info.changes > 0;
};

module.exports = {
  listRelated,
  listRelatedForTask,
  addRelated,
  removeRelated,
  clearRelatedForTask,
};
