import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  STATUS_COLUMNS,
  type Task,
  type UpdateTaskInput,
} from "@jira-lite/shared";
import { createTask, deleteTask, getTasks, updateTask } from "./api";
import { Column } from "./Column";
import { TaskModal } from "./TaskModal";
import styles from "./Board.module.css";

export function Board() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  const { mutate: create } = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) => [
        ...(old ?? []),
        newTask,
      ]);
    },
  });

  const { mutate: update } = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
    },
  });

  if (isLoading) return <div className={styles.state}>Loading…</div>;
  if (error) return <div className={styles.state}>Error loading tasks.</div>;

  const closeModal = () => {
    setCreateOpen(false);
    setEditingTask(null);
  };

  return (
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
      <div className={styles.columns}>
        {STATUS_COLUMNS.map((col) => (
          <Column
            key={col.key}
            label={col.label}
            tasks={(tasks ?? []).filter((t) => t.status === col.key)}
            onTaskClick={setEditingTask}
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
      />
    </div>
  );
}
