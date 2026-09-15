import "server-only";

import { findMeetingAlert } from "@/lib/calendar/next-meeting";
import { readCalendarSnapshot } from "@/lib/calendar/store";
import { filterCalendarEventRange } from "@/lib/calendar/visibility";
import type { CalendarDisplayState } from "@/lib/types";

const EMPTY_RANGE = {
  start: new Date(0).toISOString(),
  end: new Date(1).toISOString(),
  events: [],
};

export async function getCalendarDisplayState(
  now = new Date(),
): Promise<CalendarDisplayState> {
  const snapshot = await readCalendarSnapshot();

  if (!snapshot) {
    return {
      timezone: "Asia/Seoul",
      generatedAt: new Date(0).toISOString(),
      syncedAt: new Date(0).toISOString(),
      today: EMPTY_RANGE,
      upcoming: EMPTY_RANGE,
      browsing: EMPTY_RANGE,
      meeting: null,
      source: "unavailable",
      message: "No Google Calendar snapshot has been synced yet.",
    };
  }

  const today = filterCalendarEventRange(snapshot.today);
  const upcoming = filterCalendarEventRange(snapshot.upcoming);
  const browsing = filterCalendarEventRange(
    snapshot.browsing ?? snapshot.today,
  );

  return {
    timezone: snapshot.timezone,
    generatedAt: snapshot.generatedAt,
    syncedAt: snapshot.storedAt,
    today,
    upcoming,
    browsing,
    meeting: findMeetingAlert(upcoming.events, now),
    source: "google-apps-script",
  };
}
