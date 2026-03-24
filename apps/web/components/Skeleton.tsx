interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 60%, transparent 100%)',
        }}
      />
    </div>
  );
}

export function InputSkeleton() {
  return <Skeleton className="h-10 w-full" />;
}

export function TextSkeleton({ width = 'w-full' }: { width?: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

export function ButtonSkeleton() {
  return <Skeleton className="h-10 w-32" />;
}

export function AvatarSkeleton() {
  return <Skeleton className="w-20 h-20 rounded-full" />;
}
