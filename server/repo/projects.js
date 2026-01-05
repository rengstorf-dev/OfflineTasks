const crypto = require('crypto');

const generateId = () => crypto.randomUUID();

const parseColors = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const listProjects = (db) => {
  return db
    .prepare('SELECT id, name, color, status_colors, priority_colors, team_ids FROM projects ORDER BY name')
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      statusColors: parseColors(row.status_colors),
      priorityColors: parseColors(row.priority_colors),
      teamIds: parseColors(row.team_ids) || [],
    }));
};

const getProject = (db, id) => {
  const row = db
    .prepare('SELECT id, name, color, status_colors, priority_colors, team_ids FROM projects WHERE id = ?')
    .get(id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    statusColors: parseColors(row.status_colors),
    priorityColors: parseColors(row.priority_colors),
    teamIds: parseColors(row.team_ids) || [],
  };
};

const createProject = (db, data) => {
  const id = data.id || generateId();
  const name = data.name || '';
  const color = data.color || '#777777';
  const statusColors = data.statusColors ? JSON.stringify(data.statusColors) : null;
  const priorityColors = data.priorityColors ? JSON.stringify(data.priorityColors) : null;
  const teamIds = data.teamIds ? JSON.stringify(data.teamIds) : null;

  db.prepare(
    'INSERT INTO projects (id, name, color, status_colors, priority_colors, team_ids) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, color, statusColors, priorityColors, teamIds);

  return {
    id,
    name,
    color,
    statusColors: data.statusColors || null,
    priorityColors: data.priorityColors || null,
    teamIds: data.teamIds || [],
  };
};

const updateProject = (db, id, updates) => {
  const existing = getProject(db, id);
  if (!existing) {
    return null;
  }

  const name = updates.name ?? existing.name;
  const color = updates.color ?? existing.color;
  const statusColors =
    updates.statusColors !== undefined ? updates.statusColors : existing.statusColors;
  const priorityColors =
    updates.priorityColors !== undefined ? updates.priorityColors : existing.priorityColors;
  const teamIds = updates.teamIds !== undefined ? updates.teamIds : existing.teamIds;

  db.prepare(
    'UPDATE projects SET name = ?, color = ?, status_colors = ?, priority_colors = ?, team_ids = ? WHERE id = ?'
  ).run(
    name,
    color,
    statusColors ? JSON.stringify(statusColors) : null,
    priorityColors ? JSON.stringify(priorityColors) : null,
    teamIds ? JSON.stringify(teamIds) : null,
    id
  );

  return { id, name, color, statusColors, priorityColors, teamIds };
};

const deleteProject = (db, id) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return info.changes > 0;
};

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
