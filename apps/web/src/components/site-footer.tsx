import { useTranslations } from 'next-intl';
import styles from './site-footer.module.css';

export function SiteFooter() {
  const t = useTranslations('footer');
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>
          {t.rich('source', {
            link: (chunks) => (
              <a href="https://code.claude.com/docs/" target="_blank" rel="noreferrer noopener">
                {chunks}
              </a>
            ),
          })}
        </p>
        <p className={styles.note}>{t('disclaimer')}</p>
      </div>
    </footer>
  );
}
