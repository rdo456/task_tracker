ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DROP INDEX IF EXISTS tasks_status_active_idx;
CREATE INDEX tasks_status_active_idx ON tasks (status)
  WHERE deleted_at IS NULL AND archived_at IS NULL