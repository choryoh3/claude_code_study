const DAY_MS = 24 * 60 * 60 * 1000;

function toDayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/**
 * today を終端とする連続学習日数。today に学習がなければ、昨日までの連続を数える。
 * 日付は YYYY-MM-DD。API（サーバー）と Web（ゲストのlocalStorage）で同じ計算を使う。
 */
export function currentStreak(days: readonly string[], today: string): number {
  const set = new Set(days.map(toDayNumber));
  let cursor = toDayNumber(today);
  if (!set.has(cursor)) cursor -= 1;
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return count;
}
