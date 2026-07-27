import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  STATUS_COLUMNS,
  type Task,
  type UpdateTaskInput,
} from "@jira-lite/shared";
import { createTask, deleteTask, getTasks, updateTask } from "./api";
import { Column } from "./Column";
import { TaskModal } from "./TaskModal";
import { useToast } from "../../toast";
import styles from "./Board.module.css";

export function Board() {
  const queryClient = useQueryClient();
  const toast = useToast();
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

  // Toast on background refetch failure (we already have data, so keep the board visible).
  const lastErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (error && tasks && error !== lastErrorRef.current) {
      toast(`Failed to refresh tasks: ${(error as Error).message}`, "error");
    }
    lastErrorRef.current = error;
  }, [error, tasks, toast]);

  const { mutate: create } = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) => [
        ...(old ?? []),
        newTask,
      ]);
    },
    onError: (err) => toast(`Create failed: ${err.message}`, "error"),
  });

  const { mutate: update } = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
    },
    onError: (err) => toast(`Update failed: ${err.message}`, "error"),
  });

  const { mutate: remove } = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
    },
    onError: (err) => toast(`Delete failed: ${err.message}`, "error"),
  });

  // Initial load failed with no cached data: fall back to inline error, not a toast.
  if (error && !tasks) {
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
            isLoading={isLoading}
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
