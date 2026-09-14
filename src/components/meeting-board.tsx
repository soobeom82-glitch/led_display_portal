"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  findMeetingAlert,
  getMeetingSchedule,
  type MeetingTiming,
} from "@/lib/calendar/next-meeting";
import type { CalendarMeetingAlert } from "@/lib/types";

const meetingTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface MeetingBoardProps {
  initialMeeting: CalendarMeetingAlert | null;
  todayEvents: MeetingTiming[];
  upcomingEvents: MeetingTiming[];
}

export function MeetingBoard({
  initialMeeting,
  todayEvents,
  upcomingEvents,
}: MeetingBoardProps) {
  const router = useRouter();
  const todayMeetings = getMeetingSchedule(todayEvents);
  const [meeting, setMeeting] = useState(initialMeeting);

  useEffect(() => {
    const updateMeeting = () =>
      setMeeting(findMeetingAlert(upcomingEvents, new Date()));
    updateMeeting();

    const intervalId = window.setInterval(updateMeeting, 30_000);
    return () => window.clearInterval(intervalId);
  }, [upcomingEvents]);

  useEffect(() => {
    const refreshId = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(refreshId);
  }, [router]);

  return (
    <section className="meeting-board relative flex min-h-[620px] w-full max-w-3xl flex-col overflow-hidden rounded-[36px] border border-white/10 p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:min-h-[680px] sm:p-10">
      <div className="absolute inset-0 opacity-60">
        <div className="fine-grid h-full w-full" />
      </div>

      {meeting ? (
        <div className="relative flex flex-1 items-center justify-center">
          {meeting.phase === "upcoming" ? (
            <div className="grid w-full grid-cols-2 gap-4 sm:gap-8">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/38 sm:text-xs">
                  Starts in
                </p>
                <p className="mt-4 font-mono text-[4rem] font-semibold leading-none tracking-[-0.06em] text-cyan-200 sm:text-[6.5rem]">
                  {meeting.minutesUntil}m
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
          ) : (
            <div className="w-full text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/38 sm:text-xs">
                Room
              </p>
              <p className="mt-5 truncate font-mono text-[5rem] font-semibold leading-none tracking-[-0.05em] text-amber-200 sm:text-[8rem]">
                {meeting.location ?? "--"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col">
          <div className="flex items-end justify-between border-b border-white/12 pb-4">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/70">
              Today
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 sm:text-xs">
              Time / Room
            </p>
          </div>

          {todayMeetings.length > 0 ? (
            <div className="flex flex-1 flex-col overflow-y-auto py-3">
              {todayMeetings.map((todayMeeting) => (
                <div
                  key={`${todayMeeting.id}-${todayMeeting.start}`}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-5 border-b border-white/8 py-4 last:border-b-0 sm:gap-10 sm:py-5"
                >
                  <p className="whitespace-nowrap font-mono text-2xl font-medium tracking-[-0.04em] text-white/88 sm:text-4xl">
                    {meetingTimeFormatter.format(new Date(todayMeeting.start))}
                    <span className="mx-2 text-white/20">-</span>
                    {meetingTimeFormatter.format(new Date(todayMeeting.end))}
                  </p>
                  <p className="truncate text-right font-mono text-3xl font-semibold tracking-[-0.05em] text-amber-200 sm:text-5xl">
                    {todayMeeting.location ?? "--"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-2xl text-white/32 sm:text-4xl">
                No meetings today
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
