"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

type AgentEventType = "thought" | "tool_call" | "observation" | "answer" | "error";

interface AgentEvent {
  type: AgentEventType;
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  iteration?: number;
}

interface Turn {
  role: "user" | "agent";
  events: AgentEvent[];
  text?: string; // for user messages
}

export default function ChatInterface({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const question = input.trim();
    setInput("");
    setTurns((prev) => [...prev, { role: "user", events: [], text: question }]);

    const agentTurn: Turn = { role: "agent", events: [] };
    setTurns((prev) => [...prev, agentTurn]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/agent/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "{}") continue;
          try {
            const event: AgentEvent = JSON.parse(raw);
            setTurns((prev) => {
              const copy = [...prev];
              const last = { ...copy[copy.length - 1] };
              last.events = [...last.events, event];
              copy[copy.length - 1] = last;
              return copy;
            });
          } catch {
            // skip malformed
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setTurns((prev) => {
          const copy = [...prev];
          const last = { ...copy[copy.length - 1] };
          last.events = [...last.events, { type: "error", content: e.message ?? "stream failed" }];
          copy[copy.length - 1] = last;
          return copy;
        });
      }
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 p-3 bg-deck-panel border border-deck-line text-deck-signal hover:border-deck-signal hover:bg-deck-elev z-40 transition-colors ${className}`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[540px] bg-deck-panel/95 backdrop-blur-sm border border-deck-line flex flex-col z-40 font-mono">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-deck-line bg-deck-bg">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-deck-signal animate-pulse" />
          <span className="text-[11px] tracking-[0.2em] text-deck-fg font-bold">COMMANDER</span>
          <span className="text-[9px] text-deck-dim tracking-wider">· DIGITAL TWIN OPERATOR</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-deck-dim hover:text-deck-fg transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* transcript */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {turns.length === 0 && (
          <div className="text-[10px] text-deck-dim tracking-wider mt-4 text-center">
            Ask Commander about live risk, scenarios, or patrol routing.
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i}>
            {turn.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 text-[12px] bg-deck-signal/15 text-deck-signal border border-deck-signal/30">
                  {turn.text}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {turn.events.map((ev, j) => (
                  <EventBubble key={j} event={ev} />
                ))}
                {streaming && i === turns.length - 1 && turn.events.length === 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-deck-dim">
                    <span className="h-1.5 w-1.5 rounded-full bg-deck-signal animate-pulse" />
                    reasoning…
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-deck-line bg-deck-bg">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="› query the city…"
            className="deck-input flex-1"
            disabled={streaming}
          />
          <button type="submit" disabled={streaming} className="deck-btn deck-btn--primary">
            {streaming ? "…" : "▸ ASK"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventBubble({ event }: { event: AgentEvent }) {
  switch (event.type) {
    case "thought":
      return (
        <div className="text-[10px] text-deck-dim border-l-2 border-deck-dim/40 pl-2 py-0.5">
          {event.content}
        </div>
      );
    case "tool_call":
      return (
        <div className="text-[9px] tracking-widest px-2 py-1 border border-deck-signal/30 text-deck-signal/70 bg-deck-signal/5">
          ▸ {event.tool?.toUpperCase()}{" "}
          <span className="text-deck-dim">{JSON.stringify(event.args)}</span>
        </div>
      );
    case "observation":
      return (
        <div className="text-[9px] text-deck-dim/70 pl-2 border-l border-deck-line truncate">
          ← {event.content}
        </div>
      );
    case "answer":
      return (
        <div className="px-3 py-2 text-[12px] text-deck-fg bg-deck-elev border border-deck-line">
          {event.content}
        </div>
      );
    case "error":
      return (
        <div className="px-2 py-1 text-[10px] text-red-400 border border-red-400/30">
          ERROR: {event.content}
        </div>
      );
    default:
      return null;
  }
}
