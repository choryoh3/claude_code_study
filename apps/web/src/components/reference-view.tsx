'use client';

import { ArrowRight, Check, Copy, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { matches } from '@/lib/palette-logic';
import styles from './reference-view.module.css';

export interface ReferenceSection {
  id: string;
  title: string;
  items: Array<{
    term: string;
    description: string;
    lesson: { title: string; href: string };
  }>;
}

interface Props {
  sections: ReferenceSection[];
  /** チートシートは、そのまま入力・押下するものなので等幅＋コピーボタン。用語集は通常の文字。 */
  variant: 'cheatsheet' | 'glossary';
  searchLabel: string;
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('reference');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードが使えない環境では何もしない（文字は選択してコピーできる）
    }
  }

  return (
    <button
      type="button"
      className={styles.copy}
      onClick={copy}
      aria-label={copied ? t('copied', { text }) : t('copy', { text })}
      data-copied={copied || undefined}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
  );
}

export function ReferenceView({ sections, variant, searchLabel }: Props) {
  const t = useTranslations('reference');
  const [query, setQuery] = useState('');
  const q = query.trim();

  const visible = sections
    .map((s) => ({
      ...s,
      items: q ? s.items.filter((i) => matches(`${i.term} ${i.description}`, q)) : s.items,
    }))
    .filter((s) => s.items.length > 0);
  const total = visible.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.searchRow}>
          <Search size={18} aria-hidden="true" className={styles.searchIcon} />
          <input
            type="search"
            className={styles.search}
            placeholder={searchLabel}
            aria-label={searchLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => setQuery('')}
              aria-label={t('clearSearch')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className={styles.count} role="status" aria-live="polite">
          {q
            ? t('found', { count: total })
            : t('total', { count: sections.reduce((n, s) => n + s.items.length, 0) })}
        </p>

        {visible.length === 0 && <p className={styles.empty}>{t('empty', { query: q })}</p>}

        {visible.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={styles.section}
            // 見出しを出すのは、節が複数あるときだけ。見出しが無いのに参照すると、存在しないIDを指してしまう
            aria-labelledby={sections.length > 1 ? `${section.id}-h` : undefined}
          >
            {sections.length > 1 && <h2 id={`${section.id}-h`}>{section.title}</h2>}
            <dl className={styles.list}>
              {section.items.map((item) => (
                <div key={item.term} className={styles.item}>
                  <dt className={styles.term}>
                    {variant === 'cheatsheet' ? <code>{item.term}</code> : item.term}
                    {variant === 'cheatsheet' && <CopyButton text={item.term} />}
                  </dt>
                  <dd className={styles.desc}>
                    {item.description}
                    <Link href={item.lesson.href} className={styles.lesson}>
                      {item.lesson.title}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {sections.length > 1 && (
        <nav className={styles.toc} aria-label={t('sections')}>
          <h2>{t('sections')}</h2>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
