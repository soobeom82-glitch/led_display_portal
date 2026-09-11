import { MeetingCountdown } from "@/components/meeting-countdown";
import type { CalendarDisplayState } from "@/lib/types";

function formatMeetingStart(start: string, timezone: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(start));
}

export function MeetingBoard({ calendar }: { calendar: CalendarDisplayState }) {
  const meeting = calendar.nextMeeting;

  return (
    <section className="meeting-board relative flex min-h-[620px] w-full max-w-3xl flex-col overflow-hidden rounded-[36px] border border-white/10 p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:min-h-[680px] sm:p-10">
      <div className="absolute inset-0 opacity-60">
        <div className="fine-grid h-full w-full" />
      </div>

      <header className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-cyan-200/65">
            Ambient Calendar
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-white/92 sm:text-2xl">
            Next meeting
          </h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 font-mono text-[11px] text-white/50">
          {calendar.timezone}
        </span>
      </header>

      {meeting ? (
        <div className="relative flex flex-1 flex-col justify-center py-12">
          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/38 sm:text-xs">
                Starts in
              </p>
              <p className="mt-4 font-mono text-[4rem] font-semibold leading-none tracking-[-0.06em] text-cyan-200 sm:text-[6.5rem]">
                <MeetingCountdown
                  start={meeting.start}
                  initialLabel={meeting.startsIn}
                />
              </p>
            </div>

            <div className="border-l border-white/10 pl-5 sm:pl-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/38 sm:text-xs">
                Room
              </p>
              <p className="mt-4 truncate font-mono text-[3.2rem] font-semibold leading-none tracking-[-0.05em] text-amber-200 sm:text-[5.2rem]">
                {meeting.location ?? "--"}
              </p>
            </div>
          </div>

          <div className="mt-14 border-t border-white/10 pt-6 sm:mt-20">
            <p className="truncate text-2xl font-semibold text-white/92 sm:text-3xl">
              {meeting.title}
            </p>
            <p className="mt-2 font-mono text-sm text-white/45 sm:text-base">
              {formatMeetingStart(meeting.start, calendar.timezone)}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-mono text-6xl text-white/18 sm:text-8xl">--</p>
          <p className="mt-5 text-lg font-medium text-white/72">
            {calendar.source === "google-apps-script"
              ? "향후 7일 안에 시간 지정 회의가 없습니다."
              : "Calendar sync required"}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/38">
            {calendar.message ?? "Apps Script에서 syncCalendar를 실행하세요."}
          </p>
        </div>
      )}

      <footer className="relative flex items-center justify-between border-t border-white/8 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/28">
        <span>Google Calendar</span>
        <span>{calendar.source}</span>
      </footer>
    </section>
  );
}
