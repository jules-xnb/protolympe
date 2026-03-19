import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function SkeletonSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Skeleton & Loading
      </h2>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Skeleton</h3>
        <div className="flex items-start gap-8">
          <div className="space-y-3 w-[260px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Loading Spinner</h3>
        <div className="h-[120px] w-[300px] border rounded-lg">
          <LoadingSpinner />
        </div>
      </div>
    </section>
  );
}
