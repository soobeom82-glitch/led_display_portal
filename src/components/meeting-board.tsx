"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findNextMeetingSchedule,
  getMeetingSchedule,
  type MeetingTiming,
  UPCOMING_WINDOW_MINUTES,
} from "@/lib/calendar/next-meeting";

const meetingTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const meetingDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  weekday: "short",
  month: "short",
  day: "2-digit",
});

const DAY_LABELS = ["Yesterday", "Today", "Tomorrow"] as const;

interface MeetingDay {
  start: string;
  events: MeetingTiming[];
}

interface MeetingBoardProps {
  initialNow: string;
  meetingDays: MeetingDay[];
}

export function MeetingBoard({
  initialNow,
  meetingDays,
}: MeetingBoardProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(initialNow));
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [revealedMeetingKey, setRevealedMeetingKey] = useState<string | null>(
    null,
  );
  const selectedDay = meetingDays[selectedDayIndex] ?? meetingDays[1];
  const selectedMeetings = getMeetingSchedule(selectedDay?.events ?? []);
  const allEvents = meetingDays.flatMap((day) => day.events);
  const nextMeeting = findNextMeetingSchedule(allEvents, now);
  const countdownMinutes =
    nextMeeting && nextMeeting.minutesUntil <= UPCOMING_WINDOW_MINUTES
      ? nextMeeting.minutesUntil
      : null;
  const isUrgentCountdown =
    countdownMinutes !== null && countdownMinutes <= 3;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const refreshId = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(refreshId);
  }, [router]);

  useEffect(() => {
    const hideTitle = () => setRevealedMeetingKey(null);
    window.addEventListener("blur", hideTitle);
    return () => window.removeEventListener("blur", hideTitle);
  }, []);

  return (
    <section className="meeting-board relative flex min-h-[620px] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-white/10 p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:min-h-[680px] sm:p-10">
      <div className="absolute inset-0 opacity-60">
        <div className="fine-grid h-full w-full" />
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/12 pb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label="Previous day"
              disabled={selectedDayIndex === 0}
              onClick={() => setSelectedDayIndex((index) => Math.max(0, index - 1))}
              className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 font-mono text-3xl leading-none text-cyan-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-20 sm:size-13"
            >
              ‹
            </button>
            <div className="min-w-28 sm:min-w-36">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/80 sm:text-sm">
                {DAY_LABELS[selectedDayIndex]}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/42 sm:text-xs">
                {selectedDay
                  ? meetingDateFormatter.format(new Date(selectedDay.start))
                  : "--"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Next day"
              disabled={selectedDayIndex === meetingDays.length - 1}
              onClick={() =>
                setSelectedDayIndex((index) =>
                  Math.min(meetingDays.length - 1, index + 1),
                )
              }
              className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 font-mono text-3xl leading-none text-cyan-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-20 sm:size-13"
            >
              ›
            </button>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65 sm:text-xs">
            Time / Room
          </p>
        </div>

        {selectedMeetings.length > 0 ? (
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-3 sm:gap-3">
            {selectedMeetings.map((meeting) => {
              const meetingKey = `${meeting.id}-${meeting.start}`;
              const isTitleVisible = revealedMeetingKey === meetingKey;
              const isNextMeeting =
                nextMeeting?.id === meeting.id &&
                nextMeeting.start === meeting.start;
              const hasEnded = Date.parse(meeting.end) <= now.getTime();

              return (
                <button
                  key={meetingKey}
                  type="button"
                  aria-label="Hold to show meeting title"
                  onContextMenu={(event) => event.preventDefault()}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setRevealedMeetingKey(meetingKey);
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    setRevealedMeetingKey(null);
                  }}
                  onPointerCancel={() => setRevealedMeetingKey(null)}
                  onLostPointerCapture={() => setRevealedMeetingKey(null)}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      setRevealedMeetingKey(meetingKey);
                    }
                  }}
                  onKeyUp={() => setRevealedMeetingKey(null)}
                  onBlur={() => setRevealedMeetingKey(null)}
                  className={`relative grid w-full touch-pan-y select-none grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] items-center gap-5 text-left [-webkit-touch-callout:none] sm:gap-10 ${
                    isNextMeeting
                      ? "px-2 py-6 sm:px-3 sm:py-8"
                      : `border-b border-white/8 px-2 py-4 last:border-b-0 sm:px-3 sm:py-5 ${
                          isTitleVisible
                            ? "opacity-100"
                            : hasEnded
                              ? "opacity-30"
                              : "opacity-65"
                        }`
                  }`}
                >
                  {isTitleVisible ? (
                    <span className="pointer-events-none absolute inset-0 z-10 flex items-center rounded-2xl border border-cyan-200/20 bg-[#07151c]/95 px-5 shadow-[0_14px_40px_rgba(0,0,0,0.42)] backdrop-blur-md sm:px-7">
                      <span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-200/55 sm:text-xs">
                          Meeting title
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-3xl">
                          {meeting.title}
                        </span>
                      </span>
                    </span>
                  ) : null}
                  <div>
                    <p
                      className={`whitespace-nowrap font-mono font-medium tracking-[-0.05em] text-white/88 ${
                        isNextMeeting
                          ? "text-3xl sm:text-4xl"
                          : "text-2xl sm:text-3xl"
                      }`}
                    >
                      {meetingTimeFormatter.format(new Date(meeting.start))}
                      <span className="mx-2 text-white/20">-</span>
                      {meetingTimeFormatter.format(new Date(meeting.end))}
                      {isNextMeeting && countdownMinutes !== null ? (
                        <span
                          className={`ml-3 inline-flex items-start gap-2 rounded-full border px-3 py-1 align-middle font-mono sm:ml-4 sm:px-4 ${
                            isUrgentCountdown
                              ? "border-red-400/35 bg-red-400/12"
                              : "border-cyan-300/25 bg-cyan-300/10"
                          }`}
                        >
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
                              isUrgentCountdown
                                ? "text-red-300/70"
                                : "text-cyan-200/55"
                            }`}
                          >
                            Starts in
                          </span>
                          <span
                            className={`text-3xl font-bold leading-none tracking-[-0.06em] sm:text-5xl ${
                              isUrgentCountdown
                                ? "urgent-countdown"
                                : "text-cyan-200"
                            }`}
                          >
                            {countdownMinutes}m
                          </span>
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p
                    className={`truncate text-right font-mono font-semibold tracking-[-0.05em] text-amber-200 ${
                      isNextMeeting
                        ? "text-4xl sm:text-6xl"
                        : "text-3xl sm:text-4xl"
                    }`}
                  >
                    {meeting.location ?? "--"}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-2xl text-white/32 sm:text-4xl">
              No meetings
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
