import type { Task } from "@jira-lite/shared";
import { Card } from "./Card";
import styles from "./Column.module.css";

interface ColumnProps {
  label: string;
  tasks: Task[];
}

export function Column({ label, tasks }: ColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div className={styles.cards}>
        {tasks.map((task) => (
          <Card key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
