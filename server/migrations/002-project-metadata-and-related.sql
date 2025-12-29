ALTER TABLE projects ADD COLUMN status_colors TEXT;
ALTER TABLE projects ADD COLUMN priority_colors TEXT;

CREATE TABLE IF NOT EXISTS related_tasks (
  task_id TEXT NOT NULL,
  related_id TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  FOREIGN KEY (related_id) REFERENCES tasks (id) ON DELETE CASCADE,
  UNIQUE (task_id, related_id)
);

CREATE INDEX IF NOT EXISTS idx_related_tasks_task_id ON related_tasks (task_id);
CREATE INDEX IF NOT EXISTS idx_related_tasks_related_id ON related_tasks (related_id);
