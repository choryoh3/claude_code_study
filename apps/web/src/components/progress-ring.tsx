import styles from './progress-ring.module.css';

interface Props {
  value: number;
  max: number;
  size?: number;
  label: string;
}

/** 進捗リング。値が変わると、線が滑らかに伸びる（動きを減らす設定では即時）。 */
export function ProgressRing({ value, max, size = 148, label }: Props) {
  const stroke = Math.round(size * 0.09);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className={styles.ring}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${value} / ${max}（${percent}%）`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className={styles.bar}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.center} aria-hidden="true">
        <span className={styles.percent}>{percent}</span>
        <span className={styles.unit}>%</span>
      </div>
    </div>
  );
}
