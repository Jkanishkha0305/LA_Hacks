"use client";

import { useState, useEffect } from "react";

export function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(new Date().toISOString().slice(11, 16));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return <span className="text-deck-fg">UTC {time}</span>;
}
