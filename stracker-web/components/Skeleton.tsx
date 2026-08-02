import type { CSSProperties } from "react";

function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`animate-pulse rounded-sm bg-panel-hover ${className}`} style={style} />
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 divide-x divide-hairline border border-hairline bg-panel">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-5 py-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="border border-hairline bg-panel p-4">
      <div className="flex h-[340px] items-end gap-4 px-2 pb-10">
        {[65, 90, 45, 75, 55, 85, 40, 70].map((h, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="border-l-2 border-l-hairline border-y border-r border-hairline bg-panel px-5 py-4">
      <div className="flex gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-3 h-5 w-11/12" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <Skeleton className="mt-3 h-5 w-24" />
    </div>
  );
}

export function NewsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TickerTapeSkeleton() {
  return (
    <div className="border-y border-hairline bg-panel py-2.5">
      <Skeleton className="mx-6 h-4 w-full max-w-3xl" />
    </div>
  );
}
