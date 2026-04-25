"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BootSequenceProps {
  lines: string[];
}

export function BootSequence({ lines }: BootSequenceProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (visibleCount < lines.length) {
      const delay = 180 + Math.random() * 120;
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowCursor(true), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, lines.length]);

  return (
    <div className="space-y-2 text-[12px] font-medium text-deck-fg">
      <AnimatePresence>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-start gap-3"
          >
            <span className="text-deck-faint deck-num tabular-nums w-6 font-bold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              {line.startsWith("[ok]") ? (
                <>
                  <span className="font-bold text-deck-ok">[ok]</span>
                  {line.slice(4)}
                </>
              ) : line.startsWith("[!!]") ? (
                <>
                  <span className="font-bold text-deck-alert">[!!]</span>
                  {line.slice(4)}
                </>
              ) : (
                line
              )}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      {showCursor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="pt-3 flex items-center gap-3"
        >
          <span className="text-deck-faint deck-num tabular-nums w-6 font-bold">
            &gt;_
          </span>
          <span className="font-bold text-deck-signal">
            await ./deck start --mode live
            <span className="deck-blink">_</span>
          </span>
        </motion.div>
      )}
    </div>
  );
}
