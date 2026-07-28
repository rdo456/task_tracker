import { useState } from "react";
import { STATUS_COLUMNS, type Task } from "@jira-lite/shared";

import { Column } from "./Column";
import { TaskModal } from "./TaskModal";
import LoadingOverlay from "./LoadingOverlay";
import styles from "./Board.module.css";
import useTaskBoards from "./useTaskBoard";

export function Board() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    tasks,
    isLoading,
    isMutation,
    initialLoadFailed,
    create,
    update,
    remove,
    archive,
  } = useTaskBoards();
  // Initial load failed with no cached data: fall back to inline error, not a toast.
  if (initialLoadFailed) {
    return (
      <div className={styles.board}>
        <div className={styles.state}>
          Couldn’t load tasks. Is the API running?
        </div>
      </div>
    );
  }

  const closeModal = () => {
    setCreateOpen(false);
    setEditingTask(null);
  };

  return (
    <>
      {isMutation && <LoadingOverlay />}
      <div className={styles.board}>
        <div className={styles.header}>
          <h1 className={styles.title}>Jira-lite</h1>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => setCreateOpen(true)}
          >
            + New task
          </button>
        </div>
        <div className={styles.columns} role="list" aria-label="Task columns">
          {STATUS_COLUMNS.map((col) => (
            <Column
              key={col.key}
              label={col.label}
              tasks={(tasks ?? []).filter((t) => t.status === col.key)}
              isLoading={isLoading}
              onTaskClick={setEditingTask}
              test-id={`column-${col.key}`}
            />
          ))}
        </div>
        <TaskModal
          open={isCreateOpen || editingTask !== null}
          onClose={closeModal}
          task={editingTask ?? undefined}
          onSubmit={(input) => {
            if (editingTask) {
              update({ id: editingTask.id, input });
            } else {
              create(input);
            }
          }}
          onDelete={editingTask ? () => remove(editingTask.id) : undefined}
          onArchive={
            editingTask && editingTask.status === "complete"
              ? () => archive(editingTask.id)
              : undefined
          }
        />
      </div>
    </>
  );
}
