import type { Task, TaskPriority } from "@jira-lite/shared";
import styles from "./Card.module.css";

interface CardProps {
  task: Task;
  onClick?: () => void;
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  0: { label: "P0", className: "p0" },
  1: { label: "P1", className: "p1" },
  2: { label: "P2", className: "p2" },
  3: { label: "P3", className: "p3" },
  4: { label: "P4", className: "p4" },
  5: { label: "P5", className: "p5" },
};

export function Card({ task, onClick }: CardProps) {
  const priority = PRIORITY_META[task.priority];
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.title}>{task.title}</div>
      <div className={styles.meta}>
        <span className={styles.key}>{task.key}</span>
        <span className={`${styles.priority} ${styles[priority.className]}`}>
          {priority.label}
        </span>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden>
      <div className={`${styles.skelBar} ${styles.skelTitle}`} />
      <div className={styles.meta}>
        <div className={`${styles.skelBar} ${styles.skelKey}`} />
        <div className={`${styles.skelBar} ${styles.skelPriority}`} />
      </div>
    </div>
  );
}
