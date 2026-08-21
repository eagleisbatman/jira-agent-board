import { AppHeader } from "@/components/app-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 gap-3 overflow-x-auto px-4 py-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </main>
    </div>
  )
}
