"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

export function DisplayAutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const refresh = useEffectEvent(() => {
    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    const intervalId = window.setInterval(refresh, seconds * 1000);
    return () => window.clearInterval(intervalId);
  }, [seconds]);

  return null;
}
