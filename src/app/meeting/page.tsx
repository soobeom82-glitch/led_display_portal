import { MeetingBoard } from "@/components/meeting-board";
import { getCalendarDisplayState } from "@/lib/calendar/client";
import type { CalendarEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

function toMeetingTiming(event: CalendarEvent) {
  return {
    id: event.id,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location,
  };
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
  const initialNow = new Date().toISOString();
  const snapshotTime = formatSnapshotTime(calendar.syncedAt);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.17),transparent_28%),radial-gradient(circle_at_82%_88%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(160deg,#061116_0%,#0c1118_48%,#17120d_100%)]" />
      <div className="relative flex w-full max-w-5xl flex-col gap-4">
        <MeetingBoard
          initialNow={initialNow}
          todayEvents={calendar.today.events.map(toMeetingTiming)}
        />
        <div className="flex justify-end px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35 sm:text-xs">
          <p>
            Last snapshot{" "}
            <time dateTime={calendar.syncedAt} className="text-white/60">
              {snapshotTime}
            </time>
          </p>
        </div>
      </div>
    </main>
  );
}
