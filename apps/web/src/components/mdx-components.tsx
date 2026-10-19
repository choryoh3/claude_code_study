import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { CodeBlock } from './code-block';

/**
 * レッスン本文のH2に付けるアンカーID。固定フォーマット（ゴール→前提→解説→ハンズオン→よくある失敗→次へ）の
 * 順序に対応する。見出しの文言は言語ごとに違うので、文言ではなく「位置」で対応させる。
 */
export const SECTION_IDS = [
  'goal',
  'prerequisites',
  'explanation',
  'hands-on',
  'pitfalls',
  'next',
] as const;

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

function Anchor({ href = '', children, ...rest }: ComponentProps<'a'>) {
  // サイト内リンクは Next の Link に、外部リンクは別タブ＋安全な rel にする
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

interface Options {
  /** 見出しの文言 → アンカーID */
  headingIds: Readonly<Record<string, string>>;
  /** 表を包む領域の読み上げラベル（言語ごと） */
  tableLabel: string;
}

/** レッスン(MDX)を描画するときの、要素ごとの差し替え。文言は呼び出し側から渡す（辞書で管理する）。 */
export function createMdxComponents({ headingIds, tableLabel }: Options) {
  function H2({ children, ...rest }: ComponentProps<'h2'>) {
    const id = headingIds[textOf(children).trim()];
    return (
      <h2 id={id} {...rest}>
        {children}
      </h2>
    );
  }

  /** 表は横スクロールできるように包む（スマホで本文が崩れないように） */
  function Table({ children, ...rest }: ComponentProps<'table'>) {
    return (
      <div className="table-scroll" tabIndex={0} role="region" aria-label={tableLabel}>
        <table {...rest}>{children}</table>
      </div>
    );
  }

  return { h2: H2, a: Anchor, pre: CodeBlock, table: Table };
}
