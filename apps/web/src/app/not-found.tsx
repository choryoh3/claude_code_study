import { useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './state.module.css';

export default function NotFound() {
  const t = useTranslations('states.notFound');
  return (
    <div className={`container ${styles.state}`}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <div className={styles.actions}>
        <Link className="btn btn-primary" href="/roadmap">
          {t('roadmap')}
        </Link>
        <Link className="btn btn-ghost" href="/">
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
