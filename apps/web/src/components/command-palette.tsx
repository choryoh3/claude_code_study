'use client';

import { BookOpen, BookText, CornerDownLeft, FileText, ListChecks, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import {
  filterPages,
  filterReference,
  type PaletteGroup,
  type PaletteResult,
  type ReferenceEntry,
} from '@/lib/palette-logic';
import { NAV_ITEMS } from './site-nav';
import styles from './command-palette.module.css';

export const OPEN_PALETTE_EVENT = 'claude-study:open-palette';

const GROUP_ICON: Record<PaletteGroup, ReactNode> = {
  page: <FileText size={16} aria-hidden="true" />,
  lesson: <BookOpen size={16} aria-hidden="true" />,
  reference: <ListChecks size={16} aria-hidden="true" />,
};

/**
 * ⌘K / Ctrl+K で開く検索パレット。ページ・レッスン（APIの全文検索）・チートシート/用語集を横断して探せる。
 * ネイティブの <dialog> を使うので、フォーカスの閉じ込めと Esc での閉じる動作はブラウザが担う。
 */
export function CommandPalette({ reference }: { reference: ReferenceEntry[] }) {
  const t = useTranslations('palette');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState<PaletteResult[]>([]);
  const [searchError, setSearchError] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
  }, []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  // ⌘K / Ctrl+K と、ヘッダーのボタンから開く
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, open);
    };
  }, [open]);

  // レッスンはAPIで検索する。入力のたびに呼ばないよう少し待ち、古い応答は捨てる。
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setLessons([]);
      setSearchError(false);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.api.search.$get({ query: { q } });
        if (id !== requestId.current) return;
        if (res.status !== 200) {
          setSearchError(true);
          return;
        }
        const found = await res.json();
        if (id !== requestId.current) return;
        setSearchError(false);
        setLessons(
          found.slice(0, 6).map((l) => ({
            id: `lesson-${l.slug}`,
            group: 'lesson' as const,
            title: l.title,
            subtitle: l.summary,
            href: `/learn/${l.level}/${l.slug}`,
          })),
        );
      } catch {
        if (id === requestId.current) setSearchError(true);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const results: PaletteResult[] = [
    ...filterPages(
      NAV_ITEMS.map(({ href, key }) => ({ href, label: tNav(`items.${key}`) })),
      query,
    ),
    ...lessons,
    ...filterReference(reference, query),
  ];
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  function go(result: PaletteResult | undefined) {
    if (!result) return;
    close();
    router.push(result.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 日本語の変換確定の Enter では移動しない
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((safeActive + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((safeActive - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[safeActive]);
    }
  }

  // 選択中の項目が見えるようにスクロールする
  useEffect(() => {
    document.getElementById(`${listId}-${safeActive}`)?.scrollIntoView({ block: 'nearest' });
  }, [safeActive, listId]);

  let lastGroup: PaletteGroup | undefined;
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={t('dialog')}
      onClose={() => {
        setQuery('');
        setActive(0);
      }}
      onClick={(e) => {
        // 枠の外（背景）をクリックしたら閉じる
        if (e.target === dialogRef.current) close();
      }}
    >
      <div className={styles.box}>
        <div className={styles.inputRow}>
          <Search size={18} aria-hidden="true" className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${safeActive}` : undefined}
            aria-autocomplete="list"
            placeholder={t('placeholder')}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        <ul id={listId} role="listbox" aria-label={t('results')} className={styles.list}>
          {results.map((r, i) => {
            const heading = r.group !== lastGroup;
            lastGroup = r.group;
            return (
              <li key={r.id} role="presentation">
                {heading && (
                  <p className={styles.group} role="presentation">
                    {t(`groups.${r.group}`)}
                  </p>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === safeActive}
                  className={styles.option}
                  data-active={i === safeActive || undefined}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <span className={styles.optionIcon}>{GROUP_ICON[r.group]}</span>
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>{r.title}</span>
                    {r.subtitle && <span className={styles.optionSub}>{r.subtitle}</span>}
                  </span>
                  {i === safeActive && (
                    <CornerDownLeft size={14} aria-hidden="true" className={styles.enter} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {results.length === 0 && (
          <p className={styles.empty} role="status">
            {t('noResults', { query: query.trim() })}
          </p>
        )}
        {searchError && (
          <p className={styles.empty} role="status">
            {t('searchFailed')}
          </p>
        )}

        <footer className={styles.footer} aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('hintSelect')}
          </span>
          <span>
            <kbd>Enter</kbd> {t('hintOpen')}
          </span>
          <span className={styles.footerBrand}>
            <BookText size={12} /> {t('brand')}
          </span>
        </footer>
      </div>
    </dialog>
  );
}

/** ヘッダーに置く、パレットを開くボタン */
export function PaletteTrigger() {
  const t = useTranslations('palette');
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label={t('open')}
      // ショートカットを支援技術にも伝える（見た目の「Ctrl K」は CSS の疑似要素なので、読み上げ名には影響しない）
      aria-keyshortcuts="Control+K Meta+K"
      data-shortcut={t('triggerKey')}
    >
      <Search size={18} aria-hidden="true" />
      <span className={styles.triggerLabel}>{t('trigger')}</span>
    </button>
  );
}
