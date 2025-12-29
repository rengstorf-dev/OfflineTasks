const listDependencies = (db) => {
  return db.prepare('SELECT task_id, depends_on_id FROM dependencies').all();
};

const listDependenciesForTask = (db, taskId) => {
  return db
    .prepare('SELECT task_id, depends_on_id FROM dependencies WHERE task_id = ?')
    .all(taskId);
};

const addDependency = (db, taskId, dependsOnId) => {
  db.prepare(
    'INSERT OR IGNORE INTO dependencies (task_id, depends_on_id) VALUES (?, ?)'
  ).run(taskId, dependsOnId);
};

const removeDependency = (db, taskId, dependsOnId) => {
  const info = db
    .prepare('DELETE FROM dependencies WHERE task_id = ? AND depends_on_id = ?')
    .run(taskId, dependsOnId);
  return info.changes > 0;
};

const clearDependenciesForTask = (db, taskId) => {
  const info = db
    .prepare('DELETE FROM dependencies WHERE task_id = ? OR depends_on_id = ?')
    .run(taskId, taskId);
  return info.changes > 0;
};

module.exports = {
  listDependencies,
  listDependenciesForTask,
  addDependency,
  removeDependency,
  clearDependenciesForTask,
};
