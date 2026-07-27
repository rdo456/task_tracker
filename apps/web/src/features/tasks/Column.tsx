import type { Task } from "@jira-lite/shared";
import { Card, SkeletonCard } from "./Card";
import styles from "./Column.module.css";

interface ColumnProps {
  label: string;
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}

const SKELETON_COUNT = 2;

export function Column({ label, tasks, isLoading, onTaskClick }: ColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{isLoading ? "…" : tasks.length}</span>
      </div>
      <div className={styles.cards}>
        {isLoading ? (
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : tasks.length === 0 ? (
          <div className={styles.empty}>No tasks</div>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
