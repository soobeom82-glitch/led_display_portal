import type { CalendarEvent, CalendarNextMeeting } from "@/lib/types";

export function formatMeetingCountdown(minutesUntil: number) {
  if (minutesUntil < 60) {
    return `${minutesUntil}m`;
  }

  const hours = Math.ceil(minutesUntil / 6) / 10;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

export function findNextMeeting(
  events: CalendarEvent[],
  now: Date,
): CalendarNextMeeting | null {
  const nowTimestamp = now.getTime();
  const meeting = events
    .filter((event) => !event.allDay && Date.parse(event.start) > nowTimestamp)
    .sort((left, right) => left.start.localeCompare(right.start))[0];

  if (!meeting) {
    return null;
  }

  const minutesUntil = Math.max(
    1,
    Math.ceil((Date.parse(meeting.start) - nowTimestamp) / 60_000),
  );

  return {
    id: meeting.id,
    title: meeting.title,
    start: meeting.start,
    end: meeting.end,
    location: meeting.location.trim() || null,
    minutesUntil,
    startsIn: formatMeetingCountdown(minutesUntil),
  };
}
