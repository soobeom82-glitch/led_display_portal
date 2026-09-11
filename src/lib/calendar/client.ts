import "server-only";

import { readCalendarSnapshot } from "@/lib/calendar/store";
import type { CalendarDisplayState } from "@/lib/types";

const EMPTY_RANGE = {
  start: new Date(0).toISOString(),
  end: new Date(1).toISOString(),
  events: [],
};

export async function getCalendarDisplayState(): Promise<CalendarDisplayState> {
  const snapshot = await readCalendarSnapshot();

  if (!snapshot) {
    return {
      timezone: "Asia/Seoul",
      generatedAt: new Date(0).toISOString(),
      today: EMPTY_RANGE,
      upcoming: EMPTY_RANGE,
      source: "unavailable",
      message: "No Google Calendar snapshot has been synced yet.",
    };
  }

  return {
    timezone: snapshot.timezone,
    generatedAt: snapshot.generatedAt,
    today: snapshot.today,
    upcoming: snapshot.upcoming,
    source: "google-apps-script",
  };
}
