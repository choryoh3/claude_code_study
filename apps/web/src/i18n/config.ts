/**
 * 対応する言語。現在は日本語のみ。
 * 言語を足すときは、ここに追加し、messages/<locale>.json を作る（キー構造は ja.json と同一にする。
 * `messages.test.ts` が検査する）。
 */
export const locales = ['ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';
