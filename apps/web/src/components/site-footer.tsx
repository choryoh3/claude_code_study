import styles from './site-footer.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>
          教材の内容は、Claude Code の
          <a href="https://code.claude.com/docs/" target="_blank" rel="noreferrer noopener">
            公式ドキュメント
          </a>
          で確認した日付を各レッスンに記載しています。仕様は変わることがあるため、最新は公式をご確認ください。
        </p>
        <p className={styles.note}>非公式の学習サイトです。Anthropic とは関係ありません。</p>
      </div>
    </footer>
  );
}
