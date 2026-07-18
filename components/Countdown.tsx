"use client";

import { useEffect, useState } from "react";
import { remainingLabel } from "@/lib/format";

export function Countdown({ endAt }: { endAt: string }) {
  const [label, setLabel] = useState(() => remainingLabel(endAt));

  useEffect(() => {
    const tick = () => setLabel(remainingLabel(endAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return <span>{label}</span>;
}
