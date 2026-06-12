import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  count?: number;
  height?: string;
}

export function PageSkeleton({ count = 5, height = "h-16" }: PageSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}
