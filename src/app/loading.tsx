import { AppHeader } from "@/components/app-header"
import { ColumnSkeletons } from "@/components/board-error"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 px-4 py-6">
        <ColumnSkeletons />
      </main>
    </div>
  )
}
