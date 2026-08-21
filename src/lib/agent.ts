import { loadBoard, listTransitions, setIssueLabels } from "./jira"
import { proposeCreate, proposeTransition, type Proposal } from "./proposals"
import { readSettings, type Settings } from "./settings"

export function agentError() {
  if (!process.env.AGENT_API_KEY || !process.env.AGENT_BASE_URL) {
    return { status: 503 as const, message: "Agent is not configured." }
  }
  return null
}

const tools = [
  {
    type: "function",
    function: {
      name: "board_get",
      description: "Read the current board columns and cards.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_create_propose",
      description: "Propose creating a Task. Does not write until the operator confirms.",
      parameters: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_transition_propose",
      description: "Propose moving an existing issue. Does not write until confirm.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          transitionId: { type: "string" },
          name: { type: "string" },
        },
        required: ["key", "transitionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_labels_set",
      description: "Add or remove labels on an existing issue. Applies immediately.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          add: { type: "array", items: { type: "string" } },
          remove: { type: "array", items: { type: "string" } },
        },
        required: ["key"],
      },
    },
  },
]

type ChatMessage = { role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string }

export async function runAgentChat(messages: { role: string; content: string }[]): Promise<
  | { ok: true; reply: string; proposal?: Proposal }
  | { ok: false; status: number; message: string }
> {
  const missing = agentError()
  if (missing) return { ok: false, status: missing.status, message: missing.message }
  const settings = await readSettings()
  if (!settings) {
    return { ok: false, status: 400, message: "Add your site and token." }
  }

  const thread: ChatMessage[] = [
    {
      role: "system",
      content:
        "You operate this Jira board. Use tools. Propose create and move. Labels apply now; after labels, reply with the tool text. Never delete, assign, comment, edit, or drag. Never invent an issue key.",
    },
    ...messages,
  ]

  let proposal: Proposal | undefined
  const base = process.env.AGENT_BASE_URL!.replace(/\/+$/, "")
  const model = process.env.AGENT_MODEL || "gpt-4.1-mini"

  try {
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AGENT_API_KEY}`,
        },
        body: JSON.stringify({ model, messages: thread, tools }),
      })
      if (!res.ok) {
        return { ok: false, status: 0, message: "Could not reach the agent." }
      }
      const data = (await res.json()) as {
        choices?: { message?: ChatMessage }[]
      }
      const message = data.choices?.[0]?.message
      if (!message) {
        return { ok: false, status: 0, message: "Could not reach the agent." }
      }
      const calls = (message.tool_calls ?? []) as {
        id: string
        function: { name: string; arguments: string }
      }[]
      if (calls.length === 0) {
        return { ok: true, reply: message.content ?? "", proposal }
      }
      thread.push(message)
      for (const call of calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>
        } catch {
          args = {}
        }
        const result = await runTool(call.function.name, args, settings)
        if (result.proposal) proposal = result.proposal
        thread.push({
          role: "tool",
          content: result.text,
          tool_call_id: call.id,
        })
      }
    }
    return { ok: true, reply: "Ask me to create, move, or label an issue.", proposal }
  } catch {
    return { ok: false, status: 0, message: "Could not reach the agent." }
  }
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  settings: Settings,
) {
  if (name === "board_get") {
    const board = await loadBoard(settings)
    if (!board.ok) return { text: board.message }
    return { text: JSON.stringify(board.columns) }
  }
  if (name === "issue_create_propose") {
    const summary = String(args.summary ?? "").trim()
    if (!summary) return { text: "Summary is required." }
    const proposal = proposeCreate(summary)
    return { text: JSON.stringify(proposal), proposal }
  }
  if (name === "issue_transition_propose") {
    const key = String(args.key ?? "").trim()
    const transitionId = String(args.transitionId ?? "").trim()
    if (!key || !transitionId) return { text: "key and transitionId are required." }
    const listed = await listTransitions(settings, key)
    if (!listed.ok) return { text: listed.message }
    const match = listed.transitions.find((item) => item.id === transitionId)
    if (!match) return { text: "That transition is not available." }
    const proposal = proposeTransition(key, transitionId, String(args.name ?? match.name))
    return { text: JSON.stringify(proposal), proposal }
  }
  if (name === "issue_labels_set") {
    const key = String(args.key ?? "").trim()
    const add = Array.isArray(args.add) ? args.add.map(String) : []
    const remove = Array.isArray(args.remove) ? args.remove.map(String) : []
    const result = await setIssueLabels(settings, key, add, remove)
    if (!result.ok) return { text: result.message }
    const added = add.length ? `Added ${add.join(", ")} to ${key}.` : ""
    const removed = remove.length ? `Removed ${remove.join(", ")} from ${key}.` : ""
    return { text: [added, removed].filter(Boolean).join(" ") }
  }
  return { text: "I can't do that from chat." }
}
