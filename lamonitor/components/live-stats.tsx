"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StatItem {
  value: string;
  label: string;
}

const DEFAULT_STATS: StatItem[] = [
  { value: "500+", label: "LIVE CAMS" },
  { value: "26B", label: "LOCAL VLM" },
  { value: "<3s", label: "FRAME LATENCY" },
];

export function LiveStats() {
  const [stats, setStats] = useState<StatItem[]>(DEFAULT_STATS);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mt-16 grid max-w-xl grid-cols-3 gap-6">
      {stats.map(({ value, label }, i) => (
        <AnimatePresence key={label}>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.12 }}
              className="relative border-l-2 border-deck-line pl-4"
            >
              <div className="deck-num text-3xl font-extrabold text-deck-fg">
                {value}
              </div>
              <div className="deck-label mt-2">{label}</div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </div>
  );
}
