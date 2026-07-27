import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STATUS_COLUMNS, type Task } from "@jira-lite/shared";
import { createTask, getTasks } from "./api";
import { Column } from "./Column";
import { CreateTaskModal } from "./CreateTaskModal";
import styles from "./Board.module.css";

export function Board() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setCreateOpen] = useState(false);

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

  if (isLoading) return <div className={styles.state}>Loading…</div>;
  if (error) return <div className={styles.state}>Error loading tasks.</div>;

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
          />
        ))}
      </div>
      <CreateTaskModal
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => create(input)}
      />
    </div>
  );
}
