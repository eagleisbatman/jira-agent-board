import { AppHeader } from "@/components/app-header"
import { SettingsForm } from "@/components/settings-form"
import { readSettings, toPublic } from "@/lib/settings"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const initial = toPublic(await readSettings())
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
        <SettingsForm initial={initial} />
      </main>
    </div>
  )
}
