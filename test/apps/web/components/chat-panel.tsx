"use client"

import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@workspace/ui/components/button"
import { Send, Loader2, FileDown, ArrowRight } from "lucide-react"
import { useReportGeneration } from "@/hooks/use-report-generation"
import {
  useJsonRenderMessage,
  Renderer,
  StateProvider,
  VisibilityProvider,
  ValidationProvider,
  ActionProvider,
} from "@json-render/react"
import { registry } from "@/lib/json-render"
import { useParcelState } from "@/lib/parcel-context"
import type { ParcelContext } from "@/lib/agents/property-analyst"
import type { PropertyAnalystUIMessage } from "@/lib/agents/property-analyst"
import {
  buildAnalysisArtifact,
  getReportFilename,
  hasRawData,
} from "@/lib/analysis-artifact"
import { downloadGeneratedReport } from "@/lib/api/report-client"
import { geminiHeaders } from "@/lib/api/headers"

const transport = new DefaultChatTransport({
  api: "/api/chat",
  headers: () => geminiHeaders(),
})

const INDEPENDENT_PROMPTS = [
  "Tell me about 5 Bryant Park",
  "Analyze development potential at 120 Broadway",
  "What's the risk profile for 1515 Broadway?",
  "Evaluate 350 Fifth Ave as an investment",
]

const CONTEXTUAL_PROMPTS = [
  "What are the development risks for this property?",
  "Analyze the investment potential",
  "Are there any active violations or permits?",
  "How does this compare to nearby sales?",
]

const TOOL_LABELS: Record<string, string> = {
  geocodeAddress: "Geocoding address",
  fetchPlutoData: "Fetching property data",
  fetchViolations: "Checking violations",
  fetchPermits: "Checking permits",
  fetchComplaints: "Checking complaints",
  fetchSalesComps: "Fetching sales data",
  fetchRentData: "Fetching rent data",
  fetchCrimeData: "Checking crime data",
  fetchCensusData: "Fetching census data",
}

function AssistantMessage({ message }: { message: UIMessage }) {
  const { spec, hasSpec } = useJsonRenderMessage(message.parts)

  // Collect tool parts and text parts separately
  const toolParts = message.parts.filter(isToolUIPart)
  const textParts = message.parts.filter(
    (p): p is Extract<typeof p, { type: "text" }> =>
      p.type === "text" && "text" in p && p.text.trim() !== ""
  )

  return (
    <div className="space-y-2">
      {/* Tool call indicators */}
      {toolParts.map((part, i) => {
        const name = getToolName(part)
        const label = TOOL_LABELS[name] || name
        const done = part.state === "output-available"
        return (
          <div
            key={`tool-${i}`}
            className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"
          >
            {done ? (
              <span className="text-emerald-500">●</span>
            ) : (
              <Loader2 className="size-2.5 animate-spin" />
            )}
            <span>
              {label}
              {done ? "" : "..."}
            </span>
          </div>
        )
      })}

      {/* Rich generative UI from json-render */}
      {hasSpec && spec ? (
        <div className="mt-2 max-w-full overflow-x-hidden">
          <StateProvider initialState={{}}>
            <VisibilityProvider>
              <ValidationProvider>
                <ActionProvider>
                  <Renderer spec={spec} registry={registry} />
                </ActionProvider>
              </ValidationProvider>
            </VisibilityProvider>
          </StateProvider>
        </div>
      ) : (
        /* Fallback: plain text when no json-render spec */
        textParts.map((part, i) => (
          <div
            key={`text-${i}`}
            className="text-xs leading-relaxed whitespace-pre-wrap text-foreground"
          >
            {part.text}
          </div>
        ))
      )}
    </div>
  )
}

export function ChatPanel({
  onGeocode,
}: {
  onGeocode?: (lat: number, lng: number, label: string) => void
}) {
  const { messages, sendMessage, status } = useChat({
    transport,
  })
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const analysisArtifact = buildAnalysisArtifact(messages)
  const rawDataReady = hasRawData(analysisArtifact)
  const report = useReportGeneration()

  // Read parcel context for context-aware mode
  const { selectedBBL, parcels } = useParcelState()
  const activeParcel = useMemo<ParcelContext | null>(() => {
    if (!selectedBBL) return null
    const parcel = parcels.find((p) => p.bbl === selectedBBL)
    if (!parcel || parcel.status !== "ready" || !parcel.data) return null
    return {
      address: parcel.address,
      bbl: parcel.bbl,
      borough: parcel.borough,
      lat: parcel.lat,
      lng: parcel.lng,
      data: parcel.data,
    }
  }, [selectedBBL, parcels])

  const suggestedPrompts = activeParcel ? CONTEXTUAL_PROMPTS : INDEPENDENT_PROMPTS

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  // Extract geocode results for map marker
  useEffect(() => {
    if (!onGeocode) return
    for (const msg of messages) {
      if (msg.role !== "assistant") continue
      for (const part of msg.parts) {
        if (
          isToolUIPart(part) &&
          getToolName(part) === "geocodeAddress" &&
          part.state === "output-available" &&
          part.output &&
          typeof part.output === "object" &&
          "lat" in part.output &&
          "lng" in part.output &&
          "label" in part.output &&
          !("error" in part.output)
        ) {
          const output = part.output as {
            lat: number
            lng: number
            label: string
          }
          onGeocode(output.lat, output.lng, output.label)
        }
      }
    }
  }, [messages, onGeocode])

  const handleSend = (text: string) => {
    if (!text.trim() || status !== "ready") return
    sendMessage(
      { text },
      { body: { parcelContext: activeParcel } }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
    setInput("")
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p className="text-xs font-mono text-muted-foreground">
                NYC property analyst
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {activeParcel
                  ? `Analyzing ${activeParcel.address}`
                  : "Enter an address or try a prompt below"}
              </p>
            </div>
            <div className="space-y-1.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={status !== "ready"}
                  onClick={() => handleSend(prompt)}
                  className="group flex w-full items-center gap-2 rounded-md border border-border/50 bg-card/50 px-3 py-2 text-left text-[11px] font-mono text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground disabled:opacity-50"
                >
                  <span className="flex-1">{prompt}</span>
                  <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            {msg.role === "user" && (
              <div className="rounded-lg bg-primary/10 px-3 py-2 font-mono text-xs text-primary">
                {msg.parts
                  .filter((p) => p.type === "text")
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("")}
              </div>
            )}
            {msg.role === "assistant" && <AssistantMessage message={msg} />}
          </div>
        ))}
        {status === "streaming" && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {analysisArtifact && rawDataReady && (
        <div className="border-t border-border px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Export
              </div>
              <div className="truncate text-[11px] text-foreground">
                Analysis complete — export as HTML report
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={status !== "ready" || report.isGenerating}
              onClick={() => {
                if (analysisArtifact) {
                  report.generate(analysisArtifact, getReportFilename(analysisArtifact))
                }
              }}
            >
              {report.isGenerating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <FileDown className="size-3" />
              )}
              {report.isGenerating
                ? `Generating... (${report.elapsedSeconds}s)`
                : "Export Chat Report"}
            </Button>
          </div>
          {report.error && (
            <div className="mt-2 text-[10px] text-destructive">
              {report.error}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-1.5 border-t border-border p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder={
            activeParcel
              ? `Ask about ${activeParcel.address}...`
              : "Chat with your real estate analyst..."
          }
          className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={status !== "ready" || !input.trim()}
        >
          <Send className="size-3" />
        </Button>
      </form>
    </div>
  )
}
