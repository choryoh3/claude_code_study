'use client';

import { ArrowRight, Check, Copy, Search, X } from 'lucide-react';
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
      aria-label={copied ? `${text} をコピーしました` : `${text} をコピー`}
      data-copied={copied || undefined}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
  );
}

export function ReferenceView({ sections, variant, searchLabel }: Props) {
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
              aria-label="検索をクリア"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className={styles.count} role="status" aria-live="polite">
          {q
            ? `${total} 件が見つかりました`
            : `全 ${sections.reduce((n, s) => n + s.items.length, 0)} 件`}
        </p>

        {visible.length === 0 && (
          <p className={styles.empty}>
            「{q}」に一致する項目はありません。別の言葉でお試しください。
          </p>
        )}

        {visible.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={styles.section}
            aria-labelledby={`${section.id}-h`}
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
        <nav className={styles.toc} aria-label="セクション">
          <h2>セクション</h2>
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
