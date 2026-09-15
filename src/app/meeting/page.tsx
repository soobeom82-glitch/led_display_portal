import { MeetingBoard } from "@/components/meeting-board";
import { getCalendarDisplayState } from "@/lib/calendar/client";
import type { CalendarDisplayState, CalendarEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

function toMeetingTiming(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getSeoulDayStart(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "01";

  return Date.parse(
    `${getPart("year")}-${getPart("month")}-${getPart("day")}T00:00:00+09:00`,
  );
}

function buildMeetingDays(calendar: CalendarDisplayState, now: Date) {
  const todayStart = getSeoulDayStart(now);

  return [-1, 0, 1].map((offset) => {
    const start = todayStart + offset * DAY_MS;
    const end = start + DAY_MS;

    return {
      start: new Date(start).toISOString(),
      events: calendar.browsing.events
        .filter(
          (event) =>
            Date.parse(event.start) < end && Date.parse(event.end) > start,
        )
        .map(toMeetingTiming),
    };
  });
}

function formatSnapshotTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "--.-- --:--";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "--";

  return `${getPart("month")}.${getPart("day")} ${getPart("hour")}:${getPart("minute")}`;
}

export default async function MeetingPage() {
  const calendar = await getCalendarDisplayState();
  const now = new Date();
  const initialNow = now.toISOString();
  const snapshotTime = formatSnapshotTime(calendar.syncedAt);
  const meetingDays = buildMeetingDays(calendar, now);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.17),transparent_28%),radial-gradient(circle_at_82%_88%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(160deg,#061116_0%,#0c1118_48%,#17120d_100%)]" />
      <div className="relative flex w-full max-w-5xl flex-col gap-4">
        <MeetingBoard
          initialNow={initialNow}
          meetingDays={meetingDays}
          snapshotTime={snapshotTime}
          syncedAt={calendar.syncedAt}
        />
      </div>
    </main>
  );
}
