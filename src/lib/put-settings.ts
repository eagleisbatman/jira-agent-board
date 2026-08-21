export async function putSettings(
  body: unknown,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await res.text()
    if (!text) return { ok: false, message: "Could not reach Jira." }
    return { ok: true, data: JSON.parse(text) as Record<string, unknown> }
  } catch {
    return { ok: false, message: "Could not reach Jira." }
  } finally {
    clearTimeout(timer)
  }
}
