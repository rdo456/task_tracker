import styles from "./LoadingOverlay.module.css";

const LoadingOverlay = () => {
  return (
    <div className={styles.backdrop} role="status" aria-label="Loading">
      <div className={styles.stack}>
        <div className={styles.spinner} />
        <span className={styles.label}>Loading…</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
