import Link from "next/link";
import { BootSequence } from "@/components/boot-sequence";
import { LiveStats } from "@/components/live-stats";

const BOOT_LINES = [
  "[ok] acquiring inference backend .................. nvidia-nim@dgx.local:8000",
  "[ok] loading vlm weights ........................... gemma-4-26b-a4b",
  "[ok] vision ...................................... enabled",
  "[ok] structured output ........................... json_schema enabled",
  "[ok] caltrans d7 feed catalog .................. 500+ cameras reachable",
  "[ok] rapids pipeline ............................. cudf · cuspatial · cuml",
  "[ok] risk engine ................................. h3 res-9 · xgboost",
  "[ok] detection schedulers ......................... armed",
  "[ok] local-first — no frames leave this device",
];

export default function Home() {
  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        {/* Left: wordmark + tagline + CTA */}
        <section className="relative">
          <div className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-deck-dim">
            <span className="h-px w-10 bg-deck-signal" />
            <span className="text-deck-signal">DECK/01 — ONLINE</span>
          </div>

          <h1 className="font-mono text-[clamp(3.25rem,8.5vw,7.5rem)] font-extrabold leading-[0.92] tracking-tight text-deck-fg">
            LA
            <br />
            <span className="text-deck-signal">MONITOR</span>
            <span className="text-deck-signal deck-blink">_</span>
          </h1>

          <div className="mt-10 max-w-[54ch] space-y-4 font-sans text-[15px] font-medium leading-relaxed text-deck-fg/90">
            <p>
              An on-device AI that watches live LA infrastructure — hundreds of
              public Caltrans traffic cameras and city data feeds —
              and pipes every frame through a local Gemma 4 vision model.
            </p>
            <p>
              Nothing leaves the box. No rate limits. No API bills. Just a
              tactical HUD for whatever the city is doing right now.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/pages/cameras" className="deck-btn deck-btn--primary">
              ▶ ENTER DECK
            </Link>
            <Link href="/protected" className="deck-btn">
              // DASHBOARD
            </Link>
          </div>

          <LiveStats />
        </section>

        {/* Right: boot terminal panel */}
        <section className="relative">
          <div className="deck-panel deck-sweep p-6 overflow-hidden">
            <div className="mb-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
              <span>/sys/boot</span>
              <span className="flex items-center gap-2 text-deck-ok">
                <span className="deck-dot" />
                ALL SYSTEMS NOMINAL
              </span>
            </div>
            <div className="deck-divider-dash mb-4" />
            <BootSequence lines={BOOT_LINES} />
          </div>

          {/* secondary mini panel */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="deck-panel p-4">
              <div className="deck-label">NODE</div>
              <div className="mt-2 text-base font-bold text-deck-fg">LA-001</div>
              <div className="mt-1 text-[11px] font-medium text-deck-dim">Primary Observatory</div>
            </div>
            <div className="deck-panel p-4">
              <div className="deck-label">MODEL</div>
              <div className="mt-2 text-base font-bold text-deck-fg">GEMMA-4-26B</div>
              <div className="mt-1 text-[11px] font-medium text-deck-dim">4B active · MoE · Q4</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
