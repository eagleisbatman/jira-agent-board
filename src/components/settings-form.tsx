"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PublicSettings } from "@/lib/settings"

type SettingsResponse = PublicSettings & {
  connected?: boolean
  error?: { status: number; message: string }
  errors?: Record<string, string>
}

export function SettingsForm({ initial }: { initial: PublicSettings }) {
  const router = useRouter()
  const configured = initial.configured
  const [testing, setTesting] = useState(false)
  const [siteUrl, setSiteUrl] = useState(configured ? initial.siteUrl : "")
  const [email, setEmail] = useState(configured ? initial.email : "")
  const [apiToken, setApiToken] = useState("")
  const [projectKey, setProjectKey] = useState(configured ? initial.projectKey : "")
  const [boardId, setBoardId] = useState(configured ? (initial.boardId ?? "") : "")
  const [tokenSet, setTokenSet] = useState(configured ? initial.tokenSet : false)
  const [tokenLast4, setTokenLast4] = useState(configured ? initial.tokenLast4 : "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [connected, setConnected] = useState(configured ? initial.tokenSet : false)

  const canSave = useMemo(() => {
    return (
      siteUrl.trim() !== "" &&
      email.trim() !== "" &&
      projectKey.trim() !== "" &&
      (apiToken.trim() !== "" || tokenSet)
    )
  }, [apiToken, email, projectKey, siteUrl, tokenSet])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setTesting(true)
    setErrors({})
    setFormError(null)
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteUrl,
        email,
        apiToken,
        projectKey,
        boardId,
      }),
    })
    const data = (await res.json()) as SettingsResponse
    setTesting(false)
    if (data.errors) {
      setErrors(data.errors)
      return
    }
    if (data.configured) {
      setTokenSet(data.tokenSet)
      setTokenLast4(data.tokenLast4)
      setApiToken("")
    }
    if (data.error) {
      setFormError(data.error.message)
      setConnected(false)
      return
    }
    setConnected(true)
    router.push("/")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jira connection</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <Field
            id="siteUrl"
            label="Site URL"
            value={siteUrl}
            onChange={setSiteUrl}
            placeholder="https://your-site.atlassian.net"
            error={errors.siteUrl}
          />
          <Field
            id="email"
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            error={errors.email}
          />
          <Field
            id="apiToken"
            label="API token"
            value={apiToken}
            onChange={setApiToken}
            type="password"
            placeholder={tokenSet && tokenLast4 ? `•••• ${tokenLast4}` : undefined}
            error={errors.apiToken}
          />
          <Field
            id="projectKey"
            label="Project key"
            value={projectKey}
            onChange={setProjectKey}
            error={errors.projectKey}
          />
          <Field
            id="boardId"
            label="Board id"
            value={boardId}
            onChange={setBoardId}
            hint="Leave blank to use the first Kanban board."
          />
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          {connected && tokenLast4 && !formError ? (
            <p className="text-sm text-muted-foreground">
              Connected · token …{tokenLast4}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!canSave || testing}>
            {testing ? "Testing…" : "Save and test"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  error?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
