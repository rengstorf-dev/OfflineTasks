const crypto = require('crypto');

const generateId = () => crypto.randomUUID();

const mapRowToTask = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  projectId: row.project_id,
  metadata: {
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    startDate: row.start_date,
    endDate: row.end_date,
    kanbanOrder: row.kanban_order,
    containerColor: row.container_color || '',
  },
  children: [],
  sortIndex: row.sort_index,
  parentId: row.parent_id,
});

const listTasks = (db) => {
  return db.prepare('SELECT * FROM tasks ORDER BY sort_index, title').all();
};

const getTask = (db, id) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return row ? mapRowToTask(row) : null;
};

const createTask = (db, data) => {
  const id = data.id || generateId();
  const title = data.title || '';
  const description = data.description || '';
  const projectId = data.projectId ?? null;
  const parentId = data.parentId ?? null;
  const metadata = data.metadata || {};
  const status = metadata.status || 'todo';
  const priority = metadata.priority || 'medium';
  const assignee = metadata.assignee || '';
  const startDate = metadata.startDate || '';
  const endDate = metadata.endDate || '';
  const kanbanOrder = metadata.kanbanOrder ?? null;
  const containerColor = metadata.containerColor || '';
  const sortIndex = data.sortIndex ?? 0;

  db.prepare(
    `INSERT INTO tasks
      (id, parent_id, project_id, title, description, status, priority, assignee, start_date, end_date, kanban_order, container_color, sort_index)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parentId,
    projectId,
    title,
    description,
    status,
    priority,
    assignee,
    startDate,
    endDate,
    kanbanOrder,
    containerColor,
    sortIndex
  );

  return {
    id,
    title,
    description,
    projectId,
    metadata: { status, priority, assignee, startDate, endDate, kanbanOrder, containerColor },
    children: [],
    sortIndex,
    parentId,
  };
};

const updateTask = (db, id, updates) => {
  const existing = getTask(db, id);
  if (!existing) {
    return null;
  }

  const hasField = (key) => Object.prototype.hasOwnProperty.call(updates, key);
  const metadata = { ...existing.metadata, ...(updates.metadata || {}) };
  const next = {
    title: hasField('title') ? updates.title : existing.title,
    description: hasField('description') ? updates.description : existing.description,
    projectId: hasField('projectId') ? updates.projectId : existing.projectId,
    parentId: hasField('parentId') ? updates.parentId : existing.parentId,
    sortIndex: hasField('sortIndex') ? updates.sortIndex : existing.sortIndex,
    metadata,
  };

  db.prepare(
    `UPDATE tasks SET
      parent_id = ?,
      project_id = ?,
      title = ?,
      description = ?,
      status = ?,
      priority = ?,
      assignee = ?,
      start_date = ?,
      end_date = ?,
      kanban_order = ?,
      container_color = ?,
      sort_index = ?
     WHERE id = ?`
  ).run(
    next.parentId,
    next.projectId,
    next.title,
    next.description,
    next.metadata.status,
    next.metadata.priority,
    next.metadata.assignee,
    next.metadata.startDate,
    next.metadata.endDate,
    next.metadata.kanbanOrder,
    next.metadata.containerColor || '',
    next.sortIndex,
    id
  );

  return {
    ...existing,
    ...next,
    metadata: { ...next.metadata },
  };
};

const deleteTask = (db, id) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return info.changes > 0;
};

const getTaskTree = (db) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY sort_index, title').all();
  const byId = new Map();
  const roots = [];

  rows.forEach((row) => {
    const task = mapRowToTask(row);
    byId.set(task.id, task);
  });

  byId.forEach((task) => {
    if (task.parentId && byId.has(task.parentId)) {
      byId.get(task.parentId).children.push(task);
    } else {
      roots.push(task);
    }
  });

  return roots;
};

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTaskTree,
};
