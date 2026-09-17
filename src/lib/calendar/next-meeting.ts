import type { CalendarEvent, CalendarMeetingAlert } from "@/lib/types";

export const UPCOMING_WINDOW_MINUTES = 30;

export type MeetingTiming = Pick<
  CalendarEvent,
  | "id"
  | "title"
  | "start"
  | "end"
  | "allDay"
  | "location"
  | "videoMeeting"
>;

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

export function formatMeetingLocation(
  location: string,
  videoMeeting = false,
) {
  const room = compactMeetingLocation(location);

  if (room && videoMeeting) {
    return `${room} · 화상`;
  }

  return room ?? (videoMeeting ? "화상" : null);
}

export function getMeetingSchedule(events: MeetingTiming[]) {
  return events
    .filter((event) => !event.allDay)
    .sort((left, right) => left.start.localeCompare(right.start))
    .map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      location: formatMeetingLocation(event.location, event.videoMeeting),
    }));
}

export function findNextMeetingSchedule(events: MeetingTiming[], now: Date) {
  const nowTimestamp = now.getTime();
  const nextMeeting = getMeetingSchedule(events).find(
    (event) => Date.parse(event.start) > nowTimestamp,
  );

  if (!nextMeeting) {
    return null;
  }

  return {
    ...nextMeeting,
    minutesUntil: Math.max(
      1,
      Math.ceil((Date.parse(nextMeeting.start) - nowTimestamp) / 60_000),
    ),
  };
}

export function findMeetingAlert(
  events: MeetingTiming[],
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
        location: formatMeetingLocation(
          upcoming.location,
          upcoming.videoMeeting,
        ),
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
    location: formatMeetingLocation(
      inProgress.location,
      inProgress.videoMeeting,
    ),
    phase: "in-progress",
    minutesUntil: null,
  };
}
