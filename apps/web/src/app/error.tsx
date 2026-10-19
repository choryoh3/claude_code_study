'use client';

import { useTranslations } from 'next-intl';
import styles from './state.module.css';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('states.error');
  return (
    <div className={`container ${styles.state}`} role="alert">
      <p className={styles.code} aria-hidden="true">
        !
      </p>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          {t('retry')}
        </button>
      </div>
    </div>
  );
}
