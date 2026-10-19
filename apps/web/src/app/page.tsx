import { BookOpen, CircleCheckBig, Terminal, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { getLevelGroups, lessonHref } from '@/lib/lessons';
import styles from './home.module.css';

const STEPS: ReadonlyArray<{ title: string; body: string; Icon: LucideIcon }> = [
  { title: '読む', body: '図解と短い解説で、まず全体像をつかむ。', Icon: BookOpen },
  { title: '試す', body: 'コピーして実行できるハンズオンで、手を動かす。', Icon: Terminal },
  { title: '確認する', body: 'クイズで理解を確かめ、つまずきを見つける。', Icon: CircleCheckBig },
  { title: '定着する', body: '進捗・連続学習・バッジで、続ける力を支える。', Icon: Trophy },
];

export default function HomePage() {
  const groups = getLevelGroups();
  const first = groups[0]?.lessons[0];
  const total = groups.reduce((n, g) => n + g.lessons.length, 0);

  return (
    <>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>基礎から上級まで・日本語で学ぶ</p>
            <h1 className={styles.title}>
              Claude Codeを、
              <br />
              <span className={`${styles.titleAccent} ${styles.nowrap}`}>任せられる相棒</span>
              <span className={styles.nowrap}>に育てる。</span>
            </h1>
            <p className={styles.lead}>
              インストールから、並列実装・自己検証ループまで。読んで、試して、確認しながら、
              実務で使える形に身につけます。
            </p>
            <div className={styles.cta}>
              {first && (
                <Link className="btn btn-primary" href={lessonHref(first.level, first.slug)}>
                  最初のレッスンをはじめる
                </Link>
              )}
              <Link className="btn btn-ghost" href="/roadmap">
                ロードマップを見る
              </Link>
            </div>
            <p className={styles.meta}>登録なしですぐに始められます。公開中のレッスン: {total}本</p>
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
                ✻ Welcome to Claude Code
              </p>
              <p className={styles.line} style={{ ['--i' as string]: 2 }}>
                <span className={styles.prompt}>&gt;</span> /plan 認証のバグを直したい
              </p>
              <p className={`${styles.line} ${styles.ok}`} style={{ ['--i' as string]: 3 }}>
                ● まず調査して、計画を提案します
              </p>
              <p
                className={`${styles.line} ${styles.dim} ${styles.indent}`}
                style={{ ['--i' as string]: 4 }}
              >
                承認するまで、ファイルは変更しません
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container" aria-labelledby="loop-heading">
        <h2 id="loop-heading" className={styles.sectionTitle}>
          身につくまでの、4つのステップ
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNo} aria-hidden="true">
                <s.Icon size={18} strokeWidth={2.25} />
              </span>
              <span className={styles.stepOrder}>STEP {i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container" aria-labelledby="levels-heading">
        <h2 id="levels-heading" className={styles.sectionTitle}>
          3つのレベル
        </h2>
        <div className={styles.levels}>
          {groups.map((g) => (
            <article key={g.level} className={styles.levelCard} data-level={g.level}>
              <span className="level-chip" data-level={g.level}>
                {g.name}
              </span>
              <h3>{g.tagline}</h3>
              <p className={styles.levelCount}>
                {g.lessons.length > 0 ? `${g.lessons.length}本公開中` : '準備中'}
                {g.planned.length > 0 && ` ／ 今後 ${g.planned.length}本追加予定`}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
