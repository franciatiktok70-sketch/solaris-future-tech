export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className}`} />;
}

export function PlanCardSkeleton() {
  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}

export function BalanceSkeleton() {
  return (
    <div className="glass-card space-y-3 rounded-3xl p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
