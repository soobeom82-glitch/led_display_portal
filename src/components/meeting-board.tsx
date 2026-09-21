"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
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

const DAY_LABELS = ["YESTERDAY", "TODAY", "TOMORROW"] as const;
const SWIPE_THRESHOLD_PX = 60;

function formatMeetingDate(value: string) {
  const parts = meetingDateFormatter.formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.toUpperCase() ?? "--";

  return `${getPart("weekday")}. ${getPart("month")} ${getPart("day")}`;
}

interface MeetingDay {
  start: string;
  events: MeetingTiming[];
}

interface MeetingBoardProps {
  initialNow: string;
  meetingDays: MeetingDay[];
  snapshotTime: string;
  syncedAt: string;
}

export function MeetingBoard({
  initialNow,
  meetingDays,
  snapshotTime,
  syncedAt,
}: MeetingBoardProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(initialNow));
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [revealedMeetingKey, setRevealedMeetingKey] = useState<string | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const swipeAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const selectedDay = meetingDays[selectedDayIndex] ?? meetingDays[1];
  const meetingSchedules = meetingDays.map((day) =>
    getMeetingSchedule(day.events),
  );
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
    const resetInteraction = () => {
      setRevealedMeetingKey(null);
      setDragOffset(0);
      setIsDragging(false);
      swipeStartRef.current = null;
      swipeAxisRef.current = null;
    };
    window.addEventListener("blur", resetInteraction);
    return () => window.removeEventListener("blur", resetInteraction);
  }, []);

  function startSwipe(event: PointerEvent<HTMLElement>) {
    swipeAxisRef.current = null;
    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    const target = event.target as Element;
    if (!target.closest("button")) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function trackSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (
      swipeAxisRef.current === null &&
      Math.max(horizontalDistance, verticalDistance) > 8
    ) {
      swipeAxisRef.current =
        horizontalDistance > verticalDistance ? "horizontal" : "vertical";
    }

    if (swipeAxisRef.current === "horizontal") {
      const isPastStart = selectedDayIndex === 0 && deltaX > 0;
      const isPastEnd =
        selectedDayIndex === meetingDays.length - 1 && deltaX < 0;
      setRevealedMeetingKey(null);
      setIsDragging(true);
      setDragOffset(isPastStart || isPastEnd ? deltaX * 0.22 : deltaX);
    }
  }

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    const wasHorizontal = swipeAxisRef.current === "horizontal";
    swipeAxisRef.current = null;
    if (!start || start.pointerId !== event.pointerId) {
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    const isShortSwipe =
      Math.abs(horizontalDistance) < SWIPE_THRESHOLD_PX ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.2;
    if (!wasHorizontal || isShortSwipe) {
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    setSelectedDayIndex((index) =>
      Math.max(
        0,
        Math.min(
          meetingDays.length - 1,
          index + (horizontalDistance < 0 ? 1 : -1),
        ),
      ),
    );
    setDragOffset(0);
    setIsDragging(false);
  }

  function rotateDay() {
    if (meetingDays.length === 0) {
      return;
    }

    setRevealedMeetingKey(null);
    setSelectedDayIndex((index) => (index + 1) % meetingDays.length);
  }

  return (
    <section
      onPointerDown={startSwipe}
      onPointerMove={trackSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => {
        swipeStartRef.current = null;
        swipeAxisRef.current = null;
        setDragOffset(0);
        setIsDragging(false);
        setRevealedMeetingKey(null);
      }}
      className="meeting-board relative flex min-h-[620px] w-full max-w-5xl touch-pan-y select-none flex-col overflow-hidden rounded-[36px] border border-white/10 p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:min-h-[680px] sm:p-10"
    >
      <div className="absolute inset-0 opacity-60">
        <div className="fine-grid h-full w-full" />
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/15 pb-4">
          <button
            type="button"
            onClick={rotateDay}
            aria-label={`Show next day. Currently ${DAY_LABELS[selectedDayIndex]}`}
            className="flex min-w-0 touch-manipulation flex-col items-center rounded-xl px-2 py-1 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200/70 active:bg-white/10"
          >
            <p className="whitespace-nowrap font-mono text-base font-bold uppercase tracking-[0.12em] text-cyan-100 sm:text-lg sm:tracking-[0.16em]">
              {DAY_LABELS[selectedDayIndex]}
              <span className="ml-2 text-white/85 sm:ml-3">
                {selectedDay ? formatMeetingDate(selectedDay.start) : "--"}
              </span>
            </p>
            <div
              aria-label={`Day ${selectedDayIndex + 1} of ${meetingDays.length}`}
              className="mt-2 flex items-center justify-center gap-1.5"
            >
              {meetingDays.map((day, index) => (
                <span
                  key={day.start}
                  className={`block size-1.5 rounded-full transition-colors sm:size-2 ${
                    index === selectedDayIndex
                      ? "bg-cyan-200"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </button>
          <div className="ml-auto shrink-0 text-right font-mono uppercase">
            <p className="text-[10px] tracking-[0.1em] text-white/70 sm:text-xs sm:tracking-[0.14em]">
              Last snapshot{" "}
              <time dateTime={syncedAt} className="font-bold text-amber-100">
                {snapshotTime}
              </time>
            </p>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`flex min-h-0 w-full flex-1 will-change-transform ${
              isDragging
                ? ""
                : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            }`}
            style={{
              transform: `translate3d(calc(${-selectedDayIndex * 100}% + ${dragOffset}px), 0, 0)`,
            }}
          >
            {meetingSchedules.map((meetings, dayIndex) => (
              <div
                key={meetingDays[dayIndex].start}
                aria-hidden={dayIndex !== selectedDayIndex}
                className="flex h-full w-full shrink-0 flex-col gap-2 overflow-y-auto py-3 sm:gap-3"
              >
                {meetings.length > 0 ? meetings.map((meeting) => {
              const meetingKey = `${meeting.id}-${meeting.start}`;
              const isTitleVisible = revealedMeetingKey === meetingKey;
              const isNextMeeting =
                nextMeeting?.id === meeting.id &&
                nextMeeting.start === meeting.start;
              const hasEnded = Date.parse(meeting.end) <= now.getTime();
              const hasRoomAndVideo = meeting.location?.includes(" · ");

              return (
                <button
                  key={meetingKey}
                  type="button"
                  tabIndex={dayIndex === selectedDayIndex ? 0 : -1}
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
                      hasRoomAndVideo
                        ? isNextMeeting
                          ? "text-3xl sm:text-4xl"
                          : "text-2xl sm:text-3xl"
                        : isNextMeeting
                          ? "text-4xl sm:text-6xl"
                          : "text-3xl sm:text-4xl"
                    }`}
                  >
                    {meeting.location ?? "--"}
                  </p>
                </button>
              );
                }) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="font-mono text-2xl text-white/32 sm:text-4xl">
                      No meetings
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
