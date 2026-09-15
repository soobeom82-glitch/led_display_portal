import type { CalendarEvent, CalendarEventRange } from "@/lib/types";

export function shouldDisplayCalendarEvent(
  event: Pick<CalendarEvent, "title" | "responseStatus">,
) {
  return event.responseStatus !== "no" && !event.title.includes("휴가");
}

export function filterCalendarEventRange(
  range: CalendarEventRange,
): CalendarEventRange {
  return {
    ...range,
    events: range.events.filter(shouldDisplayCalendarEvent),
  };
}
