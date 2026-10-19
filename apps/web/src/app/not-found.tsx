import Link from 'next/link';
import styles from './state.module.css';

export default function NotFound() {
  return (
    <div className={`container ${styles.state}`}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1>ページが見つかりません</h1>
      <p>URLが変わったか、まだ公開されていないページです。ロードマップから探してみてください。</p>
      <div className={styles.actions}>
        <Link className="btn btn-primary" href="/roadmap">
          ロードマップへ
        </Link>
        <Link className="btn btn-ghost" href="/">
          トップへ
        </Link>
      </div>
    </div>
  );
}
