"use client";

import { useEffect, useState } from "react";
import { formatMeetingCountdown } from "@/lib/calendar/next-meeting";

function getCountdown(start: string) {
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(start) - Date.now()) / 60_000),
  );
  return minutes === 0 ? "Now" : formatMeetingCountdown(minutes);
}

export function MeetingCountdown({
  start,
  initialLabel,
}: {
  start: string;
  initialLabel: string;
}) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    const updateCountdown = () => setLabel(getCountdown(start));
    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 30_000);
    return () => window.clearInterval(intervalId);
  }, [start]);

  return <>{label}</>;
}
