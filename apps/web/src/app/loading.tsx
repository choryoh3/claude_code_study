import { useTranslations } from 'next-intl';
import styles from './state.module.css';

export default function Loading() {
  const t = useTranslations('common');
  return (
    <div className="container">
      <div className={styles.loading} role="status" aria-label={t('loading')}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
