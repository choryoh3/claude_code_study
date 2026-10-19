import { getFormatter, getTranslations } from 'next-intl/server';
import styles from './legal-document.module.css';

/** 規約・ポリシーの最終更新日。内容を変えたら、この日付も更新する。 */
export const LEGAL_UPDATED = '2026-10-19';

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;
const ISSUES_URL = 'https://github.com/choryoh3/claude_code_study/issues';

/** 利用規約・プライバシーポリシーの共通レイアウト。本文は辞書（legal.<kind>）から引く。 */
export async function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = await getTranslations('legal');
  const format = await getFormatter();

  return (
    <article className={`container ${styles.doc}`}>
      <header>
        <h1>{t(`${kind}.heading`)}</h1>
        <p className={styles.updated}>
          {t('updated', {
            date: format.dateTime(new Date(`${LEGAL_UPDATED}T00:00:00Z`), {
              dateStyle: 'long',
              timeZone: 'UTC',
            }),
          })}
        </p>
        <p className={styles.lead}>{t(`${kind}.lead`)}</p>
      </header>

      {SECTIONS.map((s) => (
        <section key={s} aria-labelledby={`${kind}-${s}`}>
          <h2 id={`${kind}-${s}`}>{t(`${kind}.${s}.title`)}</h2>
          {/* 本文中の改行（・で始まる箇条書き）を、そのまま表示する */}
          <p className={styles.body}>{t(`${kind}.${s}.body`)}</p>
        </section>
      ))}

      <p className={styles.contact}>
        {t.rich('contact', {
          link: (chunks) => (
            <a href={ISSUES_URL} target="_blank" rel="noreferrer noopener">
              {chunks}
            </a>
          ),
        })}
      </p>
    </article>
  );
}
