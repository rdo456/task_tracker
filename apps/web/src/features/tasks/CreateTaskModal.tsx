import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  STATUS_COLUMNS,
  createTaskSchema,
  type CreateTaskInput,
} from "@jira-lite/shared";
import styles from "./CreateTaskModal.module.css";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void;
}

export function CreateTaskModal({
  open,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
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
    defaultValues: {
      title: "",
      description: "",
      status: "ready",
      priority: 3,
    },
  });

  const onSubmit = (data: CreateTaskInput) => {
    onCreate(data);
    reset();
    onClose();
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <h2 className={styles.title}>New task</h2>

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
          <button
            type="button"
            onClick={onClose}
            className={styles.cancel}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submit}>
            Create
          </button>
        </div>
      </form>
    </dialog>
  );
}
