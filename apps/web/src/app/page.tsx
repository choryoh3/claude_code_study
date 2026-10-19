import { BookOpen, CircleCheckBig, Terminal, Trophy, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getLevelGroups, lessonHref } from '@/lib/lessons';
import styles from './home.module.css';

const STEPS: ReadonlyArray<{ key: 'read' | 'try' | 'check' | 'retain'; Icon: LucideIcon }> = [
  { key: 'read', Icon: BookOpen },
  { key: 'try', Icon: Terminal },
  { key: 'check', Icon: CircleCheckBig },
  { key: 'retain', Icon: Trophy },
];

export default async function HomePage() {
  const t = await getTranslations('home');
  const tLevels = await getTranslations('levels');
  const groups = getLevelGroups();
  const first = groups[0]?.lessons[0];
  const total = groups.reduce((n, g) => n + g.lessons.length, 0);

  return (
    <>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{t('eyebrow')}</p>
            <h1 className={styles.title}>
              {/* 見出しの強調と折り返し位置は、辞書側のタグ（<accent> / <nowrap>）で言語ごとに決める */}
              {t.rich('title', {
                accent: (chunks) => (
                  <span className={`${styles.titleAccent} ${styles.nowrap}`}>{chunks}</span>
                ),
                nowrap: (chunks) => <span className={styles.nowrap}>{chunks}</span>,
              })}
            </h1>
            <p className={styles.lead}>{t('lead')}</p>
            <div className={styles.cta}>
              {first && (
                <Link className="btn btn-primary" href={lessonHref(first.level, first.slug)}>
                  {t('ctaStart')}
                </Link>
              )}
              <Link className="btn btn-ghost" href="/roadmap">
                {t('ctaRoadmap')}
              </Link>
            </div>
            <p className={styles.meta}>{t('meta', { count: total })}</p>
          </div>

          <div className={styles.terminal} aria-hidden="true">
            <div className={styles.terminalBar}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.terminalBody}>
              <p className={styles.line} style={{ ['--i' as string]: 0 }}>
                <span className={styles.prompt}>$</span> claude
              </p>
              <p className={`${styles.line} ${styles.dim}`} style={{ ['--i' as string]: 1 }}>
                {t('terminal.welcome')}
              </p>
              <p className={styles.line} style={{ ['--i' as string]: 2 }}>
                <span className={styles.prompt}>&gt;</span> /plan {t('terminal.request')}
              </p>
              <p className={`${styles.line} ${styles.ok}`} style={{ ['--i' as string]: 3 }}>
                {t('terminal.reply')}
              </p>
              <p
                className={`${styles.line} ${styles.dim} ${styles.indent}`}
                style={{ ['--i' as string]: 4 }}
              >
                {t('terminal.note')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container" aria-labelledby="loop-heading">
        <h2 id="loop-heading" className={styles.sectionTitle}>
          {t('stepsTitle')}
        </h2>
        <ol className={styles.steps}>
          {STEPS.map(({ key, Icon }, i) => (
            <li key={key} className={styles.step}>
              <span className={styles.stepNo} aria-hidden="true">
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <span className={styles.stepOrder}>{t('stepLabel', { number: i + 1 })}</span>
              <h3>{t(`steps.${key}.title`)}</h3>
              <p>{t(`steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container" aria-labelledby="levels-heading">
        <h2 id="levels-heading" className={styles.sectionTitle}>
          {t('levelsTitle')}
        </h2>
        <div className={styles.levels}>
          {groups.map((g) => (
            <article key={g.level} className={styles.levelCard} data-level={g.level}>
              <span className="level-chip" data-level={g.level}>
                {tLevels(`${g.level}.name`)}
              </span>
              <h3>{tLevels(`${g.level}.tagline`)}</h3>
              <p className={styles.levelCount}>
                {g.lessons.length > 0
                  ? t('levelPublished', { count: g.lessons.length })
                  : t('comingSoon')}
                {g.planned.length > 0 && t('levelPlanned', { count: g.planned.length })}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
