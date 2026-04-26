"use client"

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "../../lib/utils"

interface TimelineProps {
  events: {
    startTime: number;
    endTime: number;
    type: 'normal' | 'warning';
    label: string;
  }[];
  totalDuration: number;
  currentTime?: number;
}

export function Timeline({ events, totalDuration, currentTime = 0 }: TimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{
    event: TimelineProps['events'][0],
    position: { x: number, y: number }
  } | null>(null);
  return (
    <>
      <div className="w-full overflow-hidden">
        <div className="relative w-full h-24 bg-deck-bg overflow-x-auto border border-deck-line">
          <div className="absolute w-full min-w-full">
            {/* Timeline base */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-deck-line transform -translate-y-1/2">
              {/* Time markers */}
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-3 w-px bg-deck-linehi"
                  style={{
                    left: `${(i / 13) * 100}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-bold tabular-nums text-deck-faint whitespace-nowrap">
                    {Math.floor((i / 13) * totalDuration)}s
                  </span>
                </div>
              ))}
            </div>

            {/* Events */}
            {events.map((event, index) => {
              const startPercentage = (event.startTime / totalDuration) * 100;
              const duration = ((event.endTime - event.startTime) / totalDuration) * 100;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute h-2 cursor-pointer",
                    event.type === 'warning' ? 'bg-deck-alert hover:bg-deck-alert/80' : 'bg-deck-signal hover:bg-deck-signal/80'
                  )}
                  style={{
                    left: `${startPercentage}%`,
                    width: `${duration}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredEvent({
                      event,
                      position: {
                        x: rect.left + (rect.width / 2),
                        y: rect.top - 20
                      }
                    });
                  }}
                  onMouseLeave={() => setHoveredEvent(null)}
                >

                </div>
              );
            })}

            {/* Current time indicator */}
            {currentTime > 0 && (
              <div
                className="absolute w-0.5 h-8 bg-deck-fg"
                style={{
                  left: `${(currentTime / totalDuration) * 100}%`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            )}
          </div>
        </div>
      </div>
      {hoveredEvent && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed px-4 py-3 bg-deck-panel/95 text-deck-fg text-sm pointer-events-none z-50 w-[250px] shadow-xl border border-deck-line transition-opacity duration-200"
          style={{
            left: `${hoveredEvent.position.x}px`,
            top: `${hoveredEvent.position.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-medium text-[12px] mb-1.5 text-deck-fg">{hoveredEvent.event.label}</div>
          <div className="text-deck-dim text-[11px] flex justify-between items-center">
            <span>
              Time: {Math.floor(hoveredEvent.event.startTime / 60)}:
              {String(Math.floor(hoveredEvent.event.startTime % 60)).padStart(2, '0')}
            </span>
            <span className={cn(
              "px-2 py-0.5",
              hoveredEvent.event.type === 'warning' ? 'bg-deck-alert/20 text-deck-alert' : 'bg-deck-signal/20 text-deck-signal'
            )}>
              {hoveredEvent.event.type === 'warning' ? 'Warning' : 'Normal'}
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
