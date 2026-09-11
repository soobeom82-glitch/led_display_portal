import type { CalendarEvent, CalendarNextMeeting } from "@/lib/types";

export function formatMeetingCountdown(minutesUntil: number) {
  if (minutesUntil < 60) {
    return `${minutesUntil}m`;
  }

  const hours = Math.ceil(minutesUntil / 6) / 10;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

export function compactMeetingLocation(location: string) {
  const roomCodes = location.match(/\b[A-Z]\d+(?:-[A-Z]+\d+|[A-Z]+\d+)\b/gi);
  const roomCode = roomCodes?.at(-1);

  if (roomCode) {
    return roomCode.toUpperCase();
  }

  const parts = location.trim().split(/\s+/);
  const lastPart = parts.at(-1) ?? "";
  const normalized = lastPart
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "");

  return normalized || null;
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
    location: compactMeetingLocation(meeting.location),
    minutesUntil,
    startsIn: formatMeetingCountdown(minutesUntil),
  };
}
