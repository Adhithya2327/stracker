import {
  TickerTapeSkeleton,
  StatsSkeleton,
  ChartSkeleton,
  NewsListSkeleton,
} from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <TickerTapeSkeleton />

      <section>
        <div className="h-7 w-40 animate-pulse rounded-sm bg-panel-hover" />
        <div className="mt-1 h-4 w-72 animate-pulse rounded-sm bg-panel-hover" />

        <div className="mt-5">
          <StatsSkeleton />
        </div>

        <div className="mt-5">
          <ChartSkeleton />
        </div>
      </section>

      <section>
        <div className="h-6 w-44 animate-pulse rounded-sm bg-panel-hover" />
        <div className="mt-4">
          <NewsListSkeleton count={5} />
        </div>
      </section>
    </div>
  );
}
