import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * デザイントークン（globals.css の色）が、WCAG 2.x AA のコントラスト比を満たすことを、数値で確かめる。
 *
 * なぜテストにするのか:
 * - アクセシビリティの機械検査（axe）は、背景がグラデーションの文字や、疑似要素が重なる文字を
 *   「要確認」にして、判定してくれない。トークンから計算すれば、その最悪の位置でも確認できる。
 * - 配色を変えたときに、基準を下回ったら、ここで失敗する。
 * - ライト/ダークを、2か所（media と data-theme）に書いているので、2つが食い違っていないことも確かめる。
 */

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

type Tokens = Record<string, string>;

/** 指定のセレクタのブロックから、`--name: value;` を取り出す */
function blockTokens(selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`セレクタが見つかりません: ${selector}`);
  const end = css.indexOf('\n}', start);
  const body = css.slice(start, end);
  const tokens: Tokens = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) tokens[m[1]!] = m[2]!.trim();
  return tokens;
}

const light = blockTokens(':root');
// ダークは、OSの設定に従う場合（@media 内）と、明示的に選んだ場合（data-theme）の2か所にある
const darkExplicit = blockTokens(":root[data-theme='dark']");
const darkMedia = blockTokens(":root:not([data-theme='light'])");

type RGB = [number, number, number];

function parseColor(value: string): { rgb: RGB; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const fn = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)%)?\s*\)$/.exec(value);
  if (fn) {
    return {
      rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])],
      alpha: fn[4] === undefined ? 1 : Number(fn[4]) / 100,
    };
  }
  throw new Error(`解釈できない色: ${value}`);
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG のコントラスト比（1〜21） */
function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** 半透明の色 over を、不透明な背景 under の上に重ねた色 */
function over(top: { rgb: RGB; alpha: number }, under: RGB): RGB {
  return top.rgb.map((c, i) => Math.round(c * top.alpha + under[i]! * (1 - top.alpha))) as RGB;
}

const rgbOf = (tokens: Tokens, name: string): RGB => {
  const value = tokens[name];
  if (!value) throw new Error(`トークンがありません: ${name}`);
  return parseColor(value).rgb;
};

/** [文字色, 背景色, 説明]。本文サイズの文字は 4.5:1 以上が必要 */
const TEXT_PAIRS: Array<[string, string]> = [
  ['--text', '--bg'],
  ['--text', '--bg-elevated'],
  ['--text', '--bg-sunken'],
  ['--text', '--accent-soft'],
  ['--text', '--success-soft'],
  ['--text-muted', '--bg'],
  ['--text-muted', '--bg-elevated'],
  ['--text-muted', '--bg-sunken'],
  ['--text-muted', '--accent-soft'],
  ['--accent', '--bg'],
  ['--accent', '--bg-elevated'],
  ['--accent', '--bg-sunken'],
  ['--accent', '--accent-soft'],
  ['--accent-hover', '--bg'],
  ['--accent-hover', '--bg-elevated'],
  ['--accent-text', '--accent'],
  ['--accent-text', '--accent-hover'],
  ['--success', '--bg-elevated'],
  ['--success', '--success-soft'],
  ['--level-basic', '--level-basic-soft'],
  ['--level-intermediate', '--level-intermediate-soft'],
  ['--level-advanced', '--level-advanced-soft'],
  ['--level-basic', '--bg-elevated'],
  ['--level-intermediate', '--bg-elevated'],
  ['--level-advanced', '--bg-elevated'],
  ['--terminal-text', '--terminal-bg'],
  ['--terminal-muted', '--terminal-bg'],
];

describe.each([
  ['ライト', light],
  // ダークが上書きしないトークン（ターミナルの文字色など）は、ライトの値を引き継ぐ
  ['ダーク', { ...light, ...darkExplicit }],
] as const)('配色のコントラスト（%s）', (_name, tokens) => {
  it.each(TEXT_PAIRS)('文字 %s は、背景 %s の上で 4.5:1 以上', (fg, bg) => {
    const ratio = contrast(rgbOf(tokens, fg), rgbOf(tokens, bg));
    expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it('フォーカスリング(--focus)は、背景に対して 3:1 以上（非テキストの基準）', () => {
    for (const bg of ['--bg', '--bg-elevated', '--bg-sunken']) {
      const ratio = contrast(rgbOf(tokens, '--focus'), rgbOf(tokens, bg));
      expect(ratio, `--focus on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it('ホームの背景の光（グラデーション）の最悪の位置でも、本文の文字が読める', () => {
    // 光の色は、中心が最も濃い。axe はグラデーション上の文字を判定できないので、
    // 「光がいちばん濃い所」と「2つの光が重なった所」を、最悪の背景として計算する。
    const bg = rgbOf(tokens, '--bg');
    const a = parseColor(tokens['--hero-glow-a']!);
    const b = parseColor(tokens['--hero-glow-b']!);
    const worstBackgrounds = [over(a, bg), over(b, bg), over(b, over(a, bg))];
    for (const under of worstBackgrounds) {
      for (const fg of ['--text', '--text-muted']) {
        const ratio = contrast(rgbOf(tokens, fg), under);
        expect(ratio, `${fg} on glow ${under} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('ホームの見出しのグラデーション文字（ライト）', () => {
  // 見出し（60px前後の太字）は「大きな文字」なので、基準は 3:1。
  // グラデーションは accent → #c026d3（要素の幅の 120% の位置で終わる）なので、
  // 文字の右端は、終点の 100/120 の位置の色になる。
  it('始点と右端の色が、背景の上で 3:1 以上', () => {
    const start = rgbOf(light, '--accent');
    const end: RGB = [0xc0, 0x26, 0xd3];
    const at = (t: number): RGB => start.map((c, i) => Math.round(c + (end[i]! - c) * t)) as RGB;
    const bg = rgbOf(light, '--bg');
    const a = parseColor(light['--hero-glow-a']!);
    const glow = over(a, bg); // 見出しは、左上の光（オレンジ）の近くにある
    for (const under of [bg, glow]) {
      for (const color of [at(0), at(100 / 120)]) {
        const ratio = contrast(color, under);
        expect(
          ratio,
          `gradient ${color} on ${under} = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('ライト/ダークの定義の一貫性', () => {
  it('ダークの色トークンが、media 版と data-theme 版で、完全に一致している', () => {
    const colorKeys = Object.keys(darkExplicit).filter((k) => k !== 'color-scheme');
    expect(colorKeys.length).toBeGreaterThan(20);
    for (const key of colorKeys) {
      expect(darkMedia[key], `${key} が media 版にある`).toBe(darkExplicit[key]);
    }
    // 逆向き（media 版にだけあるトークンが無いこと）
    expect(Object.keys(darkMedia).sort()).toEqual(Object.keys(darkExplicit).sort());
  });

  it('ダークが上書きするトークンは、すべてライトにも定義がある（名前の打ち間違いで、効かない上書きを防ぐ）', () => {
    for (const key of Object.keys(darkExplicit)) {
      expect(light[key], `ライトに ${key} がある`).toBeDefined();
    }
  });
});

describe('コントラスト計算の検算（テストの道具が正しいことの確認）', () => {
  it('黒と白は 21:1、同じ色どうしは 1:1', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrast([120, 130, 140], [120, 130, 140])).toBeCloseTo(1, 5);
  });

  it('WCAG の既知の値: #777 on 白 は、約 4.48:1（AA の 4.5 にわずかに届かない）', () => {
    expect(contrast([0x77, 0x77, 0x77], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it('基準を満たさない組み合わせを、実際に検出できる', () => {
    // 薄い灰色の文字を、白い背景に置くと、4.5:1 を大きく下回る
    expect(contrast([0xbb, 0xbb, 0xbb], [255, 255, 255])).toBeLessThan(2);
  });

  it('半透明の色の重ね合わせ: 不透明度 0 は背景のまま、1 は前景のまま', () => {
    expect(over({ rgb: [255, 0, 0], alpha: 0 }, [10, 20, 30])).toEqual([10, 20, 30]);
    expect(over({ rgb: [255, 0, 0], alpha: 1 }, [10, 20, 30])).toEqual([255, 0, 0]);
  });

  it('色の解釈: 16進と rgb(r g b / a%) の両方を読める', () => {
    expect(parseColor('#c2410c')).toEqual({ rgb: [194, 65, 12], alpha: 1 });
    expect(parseColor('rgb(251 146 60 / 28%)')).toEqual({ rgb: [251, 146, 60], alpha: 0.28 });
  });
});
