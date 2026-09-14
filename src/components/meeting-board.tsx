"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findNextMeetingSchedule,
  getMeetingSchedule,
  type MeetingTiming,
} from "@/lib/calendar/next-meeting";

const meetingTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface MeetingBoardProps {
  initialNow: string;
  todayEvents: MeetingTiming[];
}

export function MeetingBoard({
  initialNow,
  todayEvents,
}: MeetingBoardProps) {
  const router = useRouter();
  const todayMeetings = getMeetingSchedule(todayEvents);
  const [now, setNow] = useState(() => new Date(initialNow));
  const nextMeeting = findNextMeetingSchedule(todayEvents, now);
  const isUrgentCountdown =
    nextMeeting !== null && nextMeeting.minutesUntil <= 3;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const refreshId = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(refreshId);
  }, [router]);

  return (
    <section className="meeting-board relative flex min-h-[620px] w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-white/10 p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:min-h-[680px] sm:p-10">
      <div className="absolute inset-0 opacity-60">
        <div className="fine-grid h-full w-full" />
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-end justify-between border-b border-white/12 pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/70">
            Today
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65 sm:text-xs">
            Time / Room
          </p>
        </div>

        {todayMeetings.length > 0 ? (
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-3 sm:gap-3">
            {todayMeetings.map((todayMeeting) => {
              const isNextMeeting = nextMeeting?.id === todayMeeting.id &&
                nextMeeting.start === todayMeeting.start;
              const hasEnded = Date.parse(todayMeeting.end) <= now.getTime();

              return (
                <div
                  key={`${todayMeeting.id}-${todayMeeting.start}`}
                  className={`grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] items-center gap-5 sm:gap-10 ${
                    isNextMeeting
                      ? "rounded-[26px] bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(255,255,255,0.05))] px-5 py-6 shadow-[0_16px_50px_rgba(8,145,178,0.12)] sm:px-7 sm:py-8"
                      : `border-b border-white/8 px-2 py-4 last:border-b-0 sm:px-3 sm:py-5 ${
                          hasEnded ? "opacity-30" : "opacity-65"
                        }`
                  }`}
                >
                  <div>
                    <p
                      className={`whitespace-nowrap font-mono font-medium tracking-[-0.05em] text-white/88 ${
                        isNextMeeting
                          ? "text-3xl sm:text-5xl"
                          : "text-2xl sm:text-3xl"
                      }`}
                    >
                      {meetingTimeFormatter.format(new Date(todayMeeting.start))}
                      <span className="mx-2 text-white/20">-</span>
                      {meetingTimeFormatter.format(new Date(todayMeeting.end))}
                      {isNextMeeting ? (
                        <span
                          className={`ml-3 inline-flex rounded-full border px-3 py-1 align-middle font-mono text-sm font-semibold uppercase tracking-[0.08em] sm:ml-4 sm:px-4 sm:text-xl ${
                            isUrgentCountdown
                              ? "urgent-countdown border-red-400/35 bg-red-400/12"
                              : "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
                          }`}
                        >
                          Starts in {nextMeeting.minutesUntil}m
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
                    {todayMeeting.location ?? "--"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-2xl text-white/32 sm:text-4xl">
              No meetings today
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
