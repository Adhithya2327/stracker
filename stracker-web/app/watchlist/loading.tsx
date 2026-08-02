import { NewsListSkeleton } from "@/components/Skeleton";

export default function WatchlistLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-7 w-32 animate-pulse rounded-sm bg-panel-hover" />
        <div className="mt-1 h-4 w-80 animate-pulse rounded-sm bg-panel-hover" />
      </div>

      <div className="border border-hairline bg-panel p-5">
        <div className="mb-4 h-8 w-44 animate-pulse rounded-sm bg-panel-hover" />
        <div className="h-10 w-full animate-pulse rounded-sm bg-panel-hover" />
      </div>

      <NewsListSkeleton count={4} />
    </div>
  );
}
