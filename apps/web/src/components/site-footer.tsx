import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
        <nav aria-label={t('legalLabel')} className={styles.legal}>
          <Link href="/terms">{t('terms')}</Link>
          <Link href="/privacy">{t('privacy')}</Link>
        </nav>
      </div>
    </footer>
  );
}
