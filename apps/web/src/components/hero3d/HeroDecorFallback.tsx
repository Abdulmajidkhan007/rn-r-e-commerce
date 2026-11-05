import { palette } from '@kidswear/theme';

/**
 * Static decor shown while the 3D chunk loads, and permanently on weak devices,
 * without WebGL, or with `prefers-reduced-motion` (then it does not float).
 */

interface Item {
  className: string;
  /** SVG path in a 0..24 viewBox. */
  path: string;
  fill: string;
  delay: string;
}

const STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z';
const BALLOON =
  'M12 2c4 0 7 3.1 7 7.2 0 4.5-3.6 8.3-6.2 9.3l.9 1.5h-3.4l.9-1.5C8.6 17.5 5 13.7 5 9.2 5 5.1 8 2 12 2z';
const CLOUD = 'M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z';
const TEE = 'M8 3c1 1.3 2.4 2 4 2s3-.7 4-2l5 3-2 4-2-1v12H7V9l-2 1-2-4z';

const ITEMS: readonly Item[] = [
  { className: 'left-[6%] top-[8%] h-[40%]', path: CLOUD, fill: '#ffffff', delay: '0s' },
  {
    className: 'left-[46%] top-[12%] h-[38%]',
    path: BALLOON,
    fill: palette.primary[200],
    delay: '-1.5s',
  },
  {
    className: 'right-[6%] top-[28%] h-[32%]',
    path: BALLOON,
    fill: palette.secondary[200],
    delay: '-3s',
  },
  {
    className: 'left-[20%] bottom-[10%] h-[26%]',
    path: STAR,
    fill: palette.warning[200],
    delay: '-2s',
  },
  { className: 'left-[38%] top-[48%] h-[34%]', path: TEE, fill: palette.primary[50], delay: '-4s' },
  { className: 'right-[16%] bottom-[4%] h-[30%]', path: CLOUD, fill: '#ffffff', delay: '-2.5s' },
];

export function HeroDecorFallback(): React.ReactElement {
  return (
    <div className="absolute inset-0" data-testid="hero-decor-static">
      {ITEMS.map((item) => (
        <svg
          key={item.className}
          viewBox="0 0 24 24"
          className={`absolute aspect-square opacity-80 drop-shadow-sm motion-safe:animate-hero-float ${item.className}`}
          style={{ animationDelay: item.delay }}
        >
          <path d={item.path} fill={item.fill} />
        </svg>
      ))}
    </div>
  );
}
