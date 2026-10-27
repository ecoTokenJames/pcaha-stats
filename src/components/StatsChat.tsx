"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who leads U11 rep in points?",
  "How is North Shore Winter Club U11 A1 doing?",
  "Who are the top U13 goal scorers this season?",
];

const MAX_INPUT = 500;

/**
 * Renders the assistant's reply: paragraphs, bullet lines, **bold** and [links](url).
 * Built from text pieces (never innerHTML), so nothing in a reply can inject markup.
 */
function RichText({ text }: { text: string }) {
  const inline = (line: string, key: string) => {
    const parts: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1] && m[2]) {
        const internal = /^https:\/\/(www\.)?pcahastats\.com\//.test(m[2]);
        parts.push(
          <a
            key={`${key}-${i++}`}
            href={internal ? m[2].replace(/^https:\/\/(www\.)?pcahastats\.com/, "") : m[2]}
            {...(internal ? {} : { target: "_blank", rel: "noopener" })}
            className="font-medium text-blue-700 underline hover:text-blue-900"
          >
            {m[1]}
          </a>
        );
      } else if (m[3]) {
        parts.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
      }
      last = re.lastIndex;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((raw, idx) => {
        const line = raw.trimEnd();
        if (!line.trim()) return null;
        const bullet = /^\s*[-*•]\s+/.test(line);
        const content = line.replace(/^\s*[-*•]\s+/, "").replace(/^#+\s*/, "");
        return bullet ? (
          <div key={idx} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{inline(content, String(idx))}</span>
          </div>
        ) : (
          <p key={idx}>{inline(content, String(idx))}</p>
        );
      })}
    </div>
  );
}

export function StatsChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  async function ask(question: string) {
    const q = question.trim().slice(0, MAX_INPUT);
    if (!q || busy) return;
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string };
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? "Sorry, something went wrong. Please try again.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "I couldn't reach the server. Check your connection and try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-800"
          aria-label="Ask the stats assistant"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12c0 4.4-4 8-9 8a9.9 9.9 0 01-4-.8L3 20l1.3-3.9A7.6 7.6 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
          </svg>
          Ask the stats agent
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Stats assistant"
          className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[600px] sm:max-h-[calc(100vh-2rem)] sm:w-[400px] sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-gray-900">PCAHA Stats assistant</div>
              <div className="text-xs text-gray-500">Ask about any team, player or standings</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-gray-700">
                  Hi! I can look up standings, scores, leaders and player stats,
                  including how a player is trending and past seasons back to
                  2023-24. Try:
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-gray-800 hover:border-blue-300 hover:bg-blue-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 rounded-lg bg-blue-900 px-3 py-2 text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="mr-4 rounded-lg bg-gray-100 px-3 py-2 text-gray-800">
                  <RichText text={m.content} />
                </div>
              )
            )}
            {busy && (
              <div className="mr-4 rounded-lg bg-gray-100 px-3 py-2 text-gray-500">
                Looking that up…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_INPUT}
              placeholder="Ask about a team or player…"
              aria-label="Your question"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40"
            >
              Ask
            </button>
          </form>
          <p className="px-3 pb-2 text-[11px] text-gray-500">
            AI answers from PCAHA Stats data; it can make mistakes. Powered by OpenImpact.
          </p>
        </div>
      )}
    </>
  );
}
