import "server-only";

import { getAppEnv } from "@/lib/env";
import type {
  CalendarDisplayState,
  DisplayPayload,
  TeslaDisplayState,
} from "@/lib/types";
import { getCalendarDisplayState } from "@/lib/calendar/client";
import { getTeslaDisplayState } from "@/lib/tesla/client";

function formatDisplayTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

function createPayload(
  tesla: TeslaDisplayState,
  calendar: CalendarDisplayState,
  message?: string,
): DisplayPayload {
  const env = getAppEnv();
  const now = new Date();

  return {
    time: formatDisplayTime(now, env.displayTimezone),
    timezone: env.displayTimezone,
    tesla,
    calendar,
    meta: {
      source: tesla.source,
      updatedAt: now.toISOString(),
      message,
    },
  };
}

function getUnavailableTeslaState(status: string): TeslaDisplayState {
  return {
    battery: null,
    charging: false,
    limit: null,
    minutesRemaining: null,
    status,
    complete: false,
    vehicleName: null,
    source: "tesla-fallback",
  };
}

export async function getDisplayPayload() {
  const env = getAppEnv();
  const calendarPromise = getCalendarDisplayState();

  if (!env.isTeslaOauthConfigured && !env.teslaRefreshToken) {
    return createPayload(
      getUnavailableTeslaState("OAuth required"),
      await calendarPromise,
      "Tesla OAuth is not configured yet. Add Tesla credentials and complete /login.",
    );
  }

  try {
    const [tesla, calendar] = await Promise.all([
      getTeslaDisplayState(),
      calendarPromise,
    ]);
    return createPayload(tesla, calendar);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Tesla data unavailable.";

    return createPayload(
      getUnavailableTeslaState("Unavailable"),
      await calendarPromise,
      message,
    );
  }
}
