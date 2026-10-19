'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isValidElement, useRef, useState, type ReactNode } from 'react';
import styles from './code-block.module.css';

const TERMINAL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'powershell', 'ps1', 'cmd', 'text']);

/** MDXの <pre><code className="language-x">…</code></pre> から、言語と本文テキストを取り出す */
function extract(children: ReactNode): { lang: string; text: string } {
  let lang = '';
  const walk = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(walk).join('');
    if (isValidElement<{ className?: string; children?: ReactNode }>(node)) {
      const match = /language-([\w-]+)/.exec(node.props.className ?? '');
      if (match?.[1] && !lang) lang = match[1];
      return walk(node.props.children);
    }
    return '';
  };
  const text = walk(children).replace(/\n$/, '');
  return { lang, text };
}

const LANG_LABEL: Record<string, string> = {
  bash: 'bash',
  sh: 'sh',
  shell: 'shell',
  zsh: 'zsh',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  cmd: 'CMD',
  text: 'text',
};

export function CodeBlock({ children }: { children?: ReactNode }) {
  const t = useTranslations('codeBlock');
  const { lang, text } = extract(children);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const terminal = TERMINAL_LANGS.has(lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボードが使えない環境では何もしない（テキストは選択してコピーできる）
    }
  }

  return (
    <figure className={styles.block} data-terminal={terminal || undefined}>
      <figcaption className={styles.bar}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.lang}>{LANG_LABEL[lang] ?? (lang || 'code')}</span>
        <button
          type="button"
          className={styles.copy}
          onClick={copy}
          data-copied={copied || undefined}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? t('copied') : t('copy')}
        </button>
      </figcaption>
      <pre className={styles.pre} tabIndex={0}>
        <code>{text}</code>
      </pre>
      {/* スクリーンリーダーにコピー結果を伝える */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t('copiedSr') : ''}
      </span>
    </figure>
  );
}
