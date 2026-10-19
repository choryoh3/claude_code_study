'use client';

import styles from './state.module.css';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`container ${styles.state}`} role="alert">
      <p className={styles.code} aria-hidden="true">
        !
      </p>
      <h1>表示中に問題が起きました</h1>
      <p>
        一時的な問題かもしれません。もう一度試しても直らない場合は、少し時間をおいてお試しください。
      </p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          もう一度試す
        </button>
      </div>
    </div>
  );
}
