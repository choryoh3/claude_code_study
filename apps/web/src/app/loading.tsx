import styles from './state.module.css';

export default function Loading() {
  return (
    <div className="container">
      <div className={styles.loading} role="status" aria-label="読み込み中">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
