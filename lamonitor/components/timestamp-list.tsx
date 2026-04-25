"use client"

import { Button } from "@/components/ui/button"
import { Clock, AlertTriangle, Shield, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react"
import type { Timestamp } from "@/app/types"
import { useState, useEffect, useRef } from "react"

interface TimestampListProps {
  timestamps: Timestamp[]
  onTimestampClick: (timestamp: string) => void
}

export default function TimestampList({ timestamps, onTimestampClick }: TimestampListProps) {
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [longDescriptions, setLongDescriptions] = useState<number[]>([])
  const textRefs = useRef<(HTMLParagraphElement | null)[]>([])

  useEffect(() => {
    const checkTextOverflow = () => {
      const longItems = timestamps
        .map((_, index) => {
          const textElement = textRefs.current[index]
          if (!textElement) return { index, hasOverflow: false }

          // Check if the element has overflow and ellipsis
          const hasOverflow = (
            textElement.offsetWidth < textElement.scrollWidth ||
            textElement.offsetHeight < textElement.scrollHeight
          )
          
          return { index, hasOverflow }
        })
        .filter(({ hasOverflow }) => hasOverflow)
        .map(({ index }) => index)

      setLongDescriptions(longItems)
    }

    // Check after a short delay to ensure rendering is complete
    const timeoutId = setTimeout(checkTextOverflow, 100)

    // Recheck on window resize
    const handleResize = () => {
      clearTimeout(timeoutId)
      setTimeout(checkTextOverflow, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [timestamps])

  const toggleExpand = (index: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setExpandedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }
  return (
    <div className="grid gap-2">
      <div className="flex justify-between items-center mb-2">
        <div className="deck-label-hi">KEY MOMENTS</div>
        <div className="flex gap-4 text-[11px] font-bold uppercase tracking-[0.14em]">
          <div className="flex items-center gap-2">
            <span className="deck-dot text-deck-ok" />
            <span className="text-deck-dim">Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="deck-dot text-deck-alert" />
            <span className="text-deck-dim">Hazard</span>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {timestamps.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            className={`group w-full justify-start gap-2 h-auto py-3 transition-all duration-200 ${
              item.isDangerous
                ? 'bg-deck-alert/10 border-deck-alert/30 hover:bg-deck-alert/15 hover:border-deck-alert/50'
                : 'bg-deck-elev border-deck-line hover:bg-deck-panel hover:border-deck-linehi'
            } text-left relative overflow-hidden`}
            onClick={() => onTimestampClick(item.timestamp)}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200 ${
              item.isDangerous
                ? 'bg-deck-alert'
                : 'bg-deck-ok'
            }`} />
            {item.isDangerous ? (
              <ShieldAlert className="h-4 w-4 shrink-0 text-deck-alert" />
            ) : (
              <Shield className="h-4 w-4 shrink-0 text-deck-ok" />
            )}
            <div className="flex flex-col items-start w-full overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap w-full">
                <span className="deck-num text-[12px] font-bold tabular-nums text-deck-signal shrink-0">T{item.timestamp}</span>
                {item.isDangerous && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 bg-deck-alert/20 text-deck-alert border border-deck-alert/30 shrink-0">
                    ▲ HAZARD
                  </span>
                )}
              </div>
              <div className="w-full mt-1.5">
                <div 
                  className={`relative text-sm transition-all duration-200 ${longDescriptions.includes(index) ? 'cursor-pointer' : ''}`}
                  onClick={(e: React.MouseEvent) => longDescriptions.includes(index) && toggleExpand(index, e)}
                >
                  <p 
                    ref={(el) => { textRefs.current[index] = el }}
                    className={`whitespace-pre-wrap break-words text-[12px] font-medium ${expandedItems.includes(index) ? '' : 'line-clamp-1'} ${
                    item.isDangerous ? 'text-deck-alert/80' : 'text-deck-dim'
                  }`}>
                    {item.description}
                  </p>
                  {longDescriptions.includes(index) && (
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={(e: React.MouseEvent) => toggleExpand(index, e)}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && toggleExpand(index, e)}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] mt-1 cursor-pointer ${item.isDangerous ? 'text-deck-alert hover:text-deck-alert/80' : 'text-deck-faint hover:text-deck-dim'} transition-colors`}
                    >
                      {expandedItems.includes(index) ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show more
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
