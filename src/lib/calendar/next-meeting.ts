import type { CalendarEvent, CalendarMeetingAlert } from "@/lib/types";

const UPCOMING_WINDOW_MINUTES = 30;

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

export function findMeetingAlert(
  events: CalendarEvent[],
  now: Date,
): CalendarMeetingAlert | null {
  const nowTimestamp = now.getTime();
  const upcoming = events
    .filter((event) => !event.allDay && Date.parse(event.start) > nowTimestamp)
    .sort((left, right) => left.start.localeCompare(right.start))[0];

  if (upcoming) {
    const minutesUntil = Math.max(
      1,
      Math.ceil((Date.parse(upcoming.start) - nowTimestamp) / 60_000),
    );

    if (minutesUntil <= UPCOMING_WINDOW_MINUTES) {
      return {
        id: upcoming.id,
        start: upcoming.start,
        end: upcoming.end,
        location: compactMeetingLocation(upcoming.location),
        phase: "upcoming",
        minutesUntil,
      };
    }
  }

  const inProgress = events
    .filter(
      (event) =>
        !event.allDay &&
        Date.parse(event.start) <= nowTimestamp &&
        Date.parse(event.end) > nowTimestamp,
    )
    .sort((left, right) => right.start.localeCompare(left.start))[0];

  if (!inProgress) {
    return null;
  }

  return {
    id: inProgress.id,
    start: inProgress.start,
    end: inProgress.end,
    location: compactMeetingLocation(inProgress.location),
    phase: "in-progress",
    minutesUntil: null,
  };
}
