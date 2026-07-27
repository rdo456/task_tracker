import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  STATUS_COLUMNS,
  createTaskSchema,
  type CreateTaskInput,
  type Task,
} from "@jira-lite/shared";
import styles from "./TaskModal.module.css";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  onSubmit: (input: CreateTaskInput) => void;
  onDelete?: () => void;
}

const EMPTY_DEFAULTS: CreateTaskInput = {
  title: "",
  description: "",
  status: "ready",
  priority: 3,
};

function taskDefaults(task: Task): CreateTaskInput {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
  };
}

export function TaskModal({
  open,
  onClose,
  task,
  onSubmit,
  onDelete,
}: TaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    reset(task ? taskDefaults(task) : EMPTY_DEFAULTS);
  }, [task, reset]);

  const submit = (data: CreateTaskInput) => {
    onSubmit(data);
    onClose();
  };

  const handleDelete = () => {
    if (!task || !onDelete) return;
    if (window.confirm(`Delete ${task.key}: "${task.title}"?`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit(submit)}>
        <h2 className={styles.title}>
          {task ? `Edit ${task.key}` : "New task"}
        </h2>

        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input
            {...register("title")}
            className={styles.input}
            autoFocus
          />
          {errors.title && (
            <span className={styles.error}>{errors.title.message}</span>
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <textarea
            {...register("description")}
            className={styles.textarea}
            rows={3}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select {...register("status")} className={styles.select}>
              {STATUS_COLUMNS.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Priority (0–5)</span>
            <input
              type="number"
              min={0}
              max={5}
              {...register("priority", { valueAsNumber: true })}
              className={styles.input}
            />
            {errors.priority && (
              <span className={styles.error}>{errors.priority.message}</span>
            )}
          </label>
        </div>

        <div className={styles.actions}>
          {task && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className={styles.delete}
            >
              Delete
            </button>
          )}
          <div className={styles.rightGroup}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancel}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submit}>
              {task ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
