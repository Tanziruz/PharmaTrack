"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"

function SectionSkeleton({ label }: { label: string }) {
  return (
    <section className="space-y-3">
      <Skeleton className="h-5 w-32" />
      {/* Search + filter pills */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <TableSkeleton rows={label === "Pending" ? 5 : 3} cols={8} />
    </section>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      <div className="space-y-8">
        <SectionSkeleton label="Pending" />
        <SectionSkeleton label="Expired" />
      </div>
    </div>
  )
}
