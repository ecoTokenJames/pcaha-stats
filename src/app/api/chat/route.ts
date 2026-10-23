import { createHash } from "node:crypto";
import { AGENT_TOOLS, runAgentTool } from "@/lib/agent-tools";
import { SEASON } from "@/lib/data";

// Runs on the server for every question; the visitor's browser only sends text and gets text back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENIMPACT_URL =
  (process.env.OPENIMPACT_BASE_URL ?? "https://api.oimpact.ai/v1") + "/chat/completions";
const MODEL = "deepseek-v4-flash";
/** Model round-trips per question: look things up, maybe look up more, then answer. */
const MAX_ROUNDS = 4;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1_000;
/** Best-effort per-visitor limit inside one server instance; OpenImpact's caps are the hard stop. */
const QUESTIONS_PER_VISITOR_PER_DAY = 15;

const SYSTEM_PROMPT = `You are the PCAHA Stats assistant on www.pcahastats.com, an unofficial stats site for PCAHA minor hockey in British Columbia (${SEASON} season). Parents, players and coaches ask you about teams, players, standings, leaders and how players are improving.

How to answer:
- Never guess numbers. Use the tools: search first when someone names a player or team, then get_team / get_player / get_leaders. If you can't find it, say so and suggest how to search (team name with age and tier, e.g. "Burnaby Winter Club U11 A1").
- Be brief and friendly. Lead with the answer, then 2-4 supporting numbers. Use short bullet points for lists.
- Always finish with a link to the relevant page on the site, as a markdown link, e.g. [Open North Shore WC U11 A1's team page](https://www.pcahastats.com/...). Only link to pages the tools gave you.
- Improvement: compare points per game (PPG) over the season vs the last 5 games, or this season vs past seasons (from 2023-24). Report numbers, not judgments: say "PPG went from 0.8 to 1.4", never "he's struggling" or "she's bad". Mention that moving up a tier or age group usually lowers points against tougher opponents.
- Caveats when relevant: GP is the team's games played (who dressed isn't published), U9 doesn't keep score, and Vancouver Island (VIAHA) leagues only have standings.
- If a player's name is withheld, don't try to work out who it is.
- Stick to PCAHA hockey stats. Don't give medical, financial or personal advice, and don't share anything beyond what the tools return. Stats update twice nightly (around 8pm and midnight).`;

const visitorCounts = new Map<string, { day: string; n: number }>();

function visitorId(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  // Hashed: OpenImpact gets a stable per-visitor id for its per-user caps, never the IP itself
  return "pcaha-" + createHash("sha256").update(`pcahastats:${ip}`).digest("hex").slice(0, 24);
}

function overLimit(id: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = visitorCounts.get(id);
  if (!entry || entry.day !== day) {
    visitorCounts.set(id, { day, n: 1 });
    return false;
  }
  entry.n++;
  return entry.n > QUESTIONS_PER_VISITOR_PER_DAY;
}

function reply(text: string, status = 200) {
  return Response.json({ reply: text }, { status });
}

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

export async function POST(req: Request) {
  const key = process.env.OPENIMPACT_API_KEY;
  if (!key) {
    return reply("The stats assistant isn't switched on yet. Check back soon!", 503);
  }

  let body: { messages?: Array<{ role?: string; content?: string }> };
  try {
    body = await req.json();
  } catch {
    return reply("Sorry, I couldn't read that message.", 400);
  }

  // Only plain user/assistant text from the browser; the system prompt and tools are ours
  const history: ChatMessage[] = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role!, content: m.content!.slice(0, MAX_MESSAGE_CHARS) }));
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return reply("Ask me anything about PCAHA teams, players or standings.", 400);
  }

  const user = visitorId(req);
  if (overLimit(user)) {
    return reply(
      "You've asked a lot of questions today! The assistant will be ready for more tomorrow. In the meantime, try the Search page.",
      429
    );
  }

  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let res: Response;
    try {
      res = await fetch(OPENIMPACT_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: AGENT_TOOLS,
          // Last round: no more lookups, just answer with what we have
          tool_choice: round === MAX_ROUNDS - 1 ? "none" : "auto",
          max_tokens: 2_000,
          user,
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      return reply("The assistant is taking too long right now. Please try again in a minute.", 504);
    }

    if (res.status === 402) {
      // Daily spending cap (site-wide, this key, or this visitor) or balance reached
      return reply(
        "The stats assistant has answered all it can for today. It'll be back tomorrow, and the standings and leaders pages are always up to date.",
        429
      );
    }
    if (!res.ok) {
      return reply("The assistant is unavailable right now. Please try again shortly.", 502);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage; finish_reason?: string }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) return reply("Sorry, I didn't get an answer. Please try again.", 502);

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      return reply(msg.content?.trim() || "Sorry, I couldn't find an answer to that.");
    }

    // The model asked for lookups: run them here against the site's own data
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
    for (const call of calls.slice(0, 4)) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: runAgentTool(call.function?.name ?? "", call.function?.arguments ?? "{}"),
      });
    }
  }

  return reply("Sorry, that one took too many lookups. Try asking about one team or player at a time.");
}
