import { PAPER_PLANE_VIEWBOX, PAPER_PLANE_PATHS } from '@travyl/shared';

interface PaperPlaneProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PaperPlane({ size = 16, className, style }: PaperPlaneProps) {
  return (
    <svg
      viewBox={PAPER_PLANE_VIEWBOX}
      width={size}
      height={size}
      className={className}
      style={style}
      fill="currentColor"
    >
      {PAPER_PLANE_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
