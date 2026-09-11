"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { findMeetingAlert } from "@/lib/calendar/next-meeting";
import type { CalendarDisplayState } from "@/lib/types";

export function MeetingBoard({ calendar }: { calendar: CalendarDisplayState }) {
  const router = useRouter();
  const events = calendar.upcoming.events;
  const [meeting, setMeeting] = useState(calendar.meeting);

  useEffect(() => {
    const updateMeeting = () => setMeeting(findMeetingAlert(events, new Date()));
    updateMeeting();

    const intervalId = window.setInterval(updateMeeting, 30_000);
    return () => window.clearInterval(intervalId);
  }, [events]);

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
      ) : null}
    </section>
  );
}
