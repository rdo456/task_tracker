import { useQuery } from "@tanstack/react-query";
import { STATUS_COLUMNS } from "@jira-lite/shared";
import { getTasks } from "./api";
import { Column } from "./Column";
import styles from "./Board.module.css";

export function Board() {
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  if (isLoading) return <div className={styles.state}>Loading…</div>;
  if (error) return <div className={styles.state}>Error loading tasks.</div>;

  return (
    <div className={styles.board}>
      <h1 className={styles.title}>Jira-lite</h1>
      <div className={styles.columns}>
        {STATUS_COLUMNS.map((col) => (
          <Column
            key={col.key}
            label={col.label}
            tasks={(tasks ?? []).filter((t) => t.status === col.key)}
          />
        ))}
      </div>
    </div>
  );
}
