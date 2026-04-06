export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-gray-200 dark:bg-white/[0.08] rounded animate-pulse ${className}`} style={style} />;
}
