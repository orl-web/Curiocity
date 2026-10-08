export function GuideSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden animate-pulse" aria-hidden="true">
      <div className="p-3">
        <div className="flex gap-[11px]">
          <div className="w-[86px] h-[76px] rounded-lg bg-[#e5e4e7] dark:bg-[#272725] flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2 py-1">
            <div className="h-3.5 w-3/4 rounded bg-[#e5e4e7] dark:bg-[#272725]" />
            <div className="h-3 w-1/2 rounded bg-[#e5e4e7] dark:bg-[#272725]" />
            <div className="h-3 w-2/3 rounded bg-[#e5e4e7] dark:bg-[#272725]" />
            <div className="flex gap-2 mt-auto">
              <div className="h-4 w-14 rounded-full bg-[#e5e4e7] dark:bg-[#272725]" />
              <div className="h-4 w-14 rounded-full bg-[#e5e4e7] dark:bg-[#272725]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GuideSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <GuideSkeleton key={i} />
      ))}
    </>
  )
}
