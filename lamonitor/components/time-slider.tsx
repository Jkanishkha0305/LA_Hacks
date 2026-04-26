"use client";

import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TimeSliderProps {
  /** 0-167 (Mon 00:00 .. Sun 23:00). undefined = use wall-clock / live mode. */
  value: number | undefined;
  onChange: (hourOfWeek: number | undefined) => void;
  className?: string;
  /** Called when the BRANCH button is clicked with the current hour-of-week */
  onBranch?: (hourOfWeek: number) => void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/** Total slider range: 168 hours of history + current + 4 hours of forecast = 173 */
const SLIDER_MIN = 0;
const SLIDER_MAX = 172;
const NOW_TICK = 168;

function formatHour(hourOfWeek: number): { day: string; hour: string; label: string } {
  const h = ((hourOfWeek % 168) + 168) % 168;
  const day = DAYS[Math.floor(h / 24)];
  const hour = h % 24;
  const hourStr = `${String(hour).padStart(2, "0")}:00`;
  const ampm =
    hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
  return { day, hour: hourStr, label: `${day} ${ampm}` };
}

function currentHourOfWeek(): number {
  const d = new Date();
  // JS: Sunday=0, Monday=1 ... but our DAYS array is Mon-first.
  const jsDay = d.getDay();
  const monFirst = (jsDay + 6) % 7;
  return monFirst * 24 + d.getHours();
}

export function TimeSlider({ value, onChange, className, onBranch }: TimeSliderProps) {
  const isLive = value === undefined;
  const displayValue = value ?? currentHourOfWeek();
  const { label } = useMemo(() => formatHour(displayValue), [displayValue]);

  // Map internal slider position to hour-of-week
  const sliderToHour = useCallback(
    (pos: number) => {
      if (pos === NOW_TICK) return undefined; // live
      if (pos < NOW_TICK) {
        // Past: offset from current hour
        const offset = NOW_TICK - pos;
        return ((currentHourOfWeek() - offset) % 168 + 168) % 168;
      }
      // Future: offset forward (forecast)
      const offset = pos - NOW_TICK;
      return ((currentHourOfWeek() + offset) % 168 + 168) % 168;
    },
    [],
  );

  const hourToSlider = useCallback(
    (hour: number | undefined) => {
      if (hour === undefined) return NOW_TICK;
      const now = currentHourOfWeek();
      const diff = ((hour - now) % 168 + 168) % 168;
      if (diff === 0) return NOW_TICK;
      if (diff <= 4) return NOW_TICK + diff; // future zone
      return NOW_TICK - (168 - diff); // past zone
    },
    [],
  );

  const sliderPos = hourToSlider(value);
  const isFuture = sliderPos > NOW_TICK;

  // Percentage of the slider where "now" sits
  const nowPct = (NOW_TICK / SLIDER_MAX) * 100;

  const handleBranch = () => {
    if (onBranch) onBranch(displayValue);
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col gap-1 border border-deck-line bg-black/70 px-3 py-2 backdrop-blur-md",
        className,
      )}
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-deck-dim">
          <span>when</span>
          <span
            className={cn(
              "text-[11px] font-bold tabular-nums",
              isLive
                ? "text-deck-ok"
                : isFuture
                  ? "text-deck-signal"
                  : "text-deck-fg",
            )}
          >
            {isLive ? "LIVE \u00b7 NOW" : isFuture ? `+${sliderPos - NOW_TICK}H FORECAST` : label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onBranch && !isLive && (
            <button
              type="button"
              onClick={handleBranch}
              className="border border-deck-signal/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-deck-signal transition-colors hover:bg-deck-signal/10"
            >
              \u2461 BRANCH
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(isLive ? currentHourOfWeek() : undefined)}
            className={cn(
              "border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] transition-colors",
              isLive
                ? "border-deck-signal/60 text-deck-signal hover:bg-deck-signal/10"
                : "border-deck-ok/60 text-deck-ok hover:bg-deck-ok/10",
            )}
          >
            {isLive ? "scrub" : "go live"}
          </button>
        </div>
      </div>

      {/* slider track */}
      <div className="relative h-3 w-full">
        {/* past zone background */}
        <div
          className="absolute inset-y-0 left-0 bg-deck-fg/5"
          style={{ width: `${nowPct}%` }}
        />
        {/* future zone background with diagonal stripes */}
        <div
          className="absolute inset-y-0 right-0"
          style={{
            left: `${nowPct}%`,
            background:
              "repeating-linear-gradient(135deg, rgb(var(--signal) / 0.08) 0px, rgb(var(--signal) / 0.08) 2px, transparent 2px, transparent 6px)",
          }}
        />
        {/* now marker */}
        <div
          className="absolute top-0 h-full w-px bg-deck-ok"
          style={{ left: `${nowPct}%` }}
        />
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={sliderPos}
          onChange={(e) => {
            const pos = Number(e.target.value);
            onChange(sliderToHour(pos));
          }}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-deck-signal",
            "[&::-webkit-slider-thumb]:bg-deck-signal",
            "[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgb(var(--signal)/0.6)]",
          )}
        />
      </div>

      {/* labels */}
      <div className="flex items-center justify-between text-[7px] font-bold uppercase tracking-widest text-deck-faint">
        <span>-24H</span>
        <span className="text-deck-ok">NOW</span>
        <span className="text-deck-signal">+4H</span>
      </div>
    </div>
  );
}
