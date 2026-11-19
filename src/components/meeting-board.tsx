"use client";

import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  findNextMeetingSchedule,
  getCurrentTimeMarker,
  getMeetingSchedule,
  type MeetingTiming,
  UPCOMING_WINDOW_MINUTES,
} from "@/lib/calendar/next-meeting";
import {
  getMeetingSkinForDate,
  getNextMeetingSkin,
  isMeetingSkin,
  type MeetingSkin,
} from "@/lib/calendar/meeting-skin";
import type { CalendarEvent } from "@/lib/types";

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
const SKIN_OVERRIDES_STORAGE_KEY = "meeting-skin-overrides-v1";
const SKIN_OVERRIDES_EVENT = "meeting-skin-overrides-change";

function subscribeToSkinOverrides(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SKIN_OVERRIDES_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SKIN_OVERRIDES_EVENT, onStoreChange);
  };
}

function getSkinOverridesSnapshot() {
  try {
    return window.localStorage.getItem(SKIN_OVERRIDES_STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function getServerSkinOverridesSnapshot() {
  return "{}";
}

function parseSkinOverrides(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, MeetingSkin] =>
        isMeetingSkin(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function saveSkinOverride(dateKey: string, skin: MeetingSkin) {
  const overrides = parseSkinOverrides(getSkinOverridesSnapshot());
  const nextOverrides = JSON.stringify({ ...overrides, [dateKey]: skin });

  try {
    window.localStorage.setItem(SKIN_OVERRIDES_STORAGE_KEY, nextOverrides);
  } catch {
    return;
  }

  window.dispatchEvent(new Event(SKIN_OVERRIDES_EVENT));
}

function formatMeetingDate(value: string) {
  const parts = meetingDateFormatter.formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.toUpperCase() ?? "--";

  return `${getPart("weekday")}. ${getPart("month")} ${getPart("day")}`;
}

function getLocationTextSizeClass(location: string | null, isNext: boolean) {
  const length = location?.length ?? 0;

  if (length > 12) {
    return isNext
      ? "text-[clamp(1.25rem,3.2vw,2.25rem)]"
      : "text-[clamp(1.125rem,2.8vw,1.875rem)]";
  }

  if (length > 7) {
    return isNext
      ? "text-[clamp(1.75rem,4.5vw,2.75rem)]"
      : "text-[clamp(1.5rem,3.8vw,2.25rem)]";
  }

  return isNext ? "text-4xl sm:text-6xl" : "text-3xl sm:text-4xl";
}

function getResponseBadge(status: CalendarEvent["responseStatus"]) {
  switch (status) {
    case "yes":
      return {
        label: "수락",
        className: "border-emerald-400/80 bg-emerald-600",
      };
    case "maybe":
      return {
        label: "미정",
        className: "border-amber-400/80 bg-amber-600",
      };
    case "invited":
      return {
        label: "미응답",
        className: "border-slate-400/80 bg-slate-600",
      };
    case "owner":
      return {
        label: "주최",
        className: "border-cyan-400/80 bg-cyan-700",
      };
    case "no":
      return {
        label: "거절",
        className: "border-rose-400/80 bg-rose-600",
      };
    default:
      return null;
  }
}

function CurrentTimeLine({
  now,
  positionPercent,
  skin,
}: {
  now: Date;
  positionPercent: number;
  skin: MeetingSkin;
}) {
  const currentTime = meetingTimeFormatter.format(now);
  const isPaper = skin === "paper";

  return (
    <span
      role="separator"
      aria-label={`Current time ${currentTime}`}
      className="pointer-events-none absolute inset-x-2 z-20 flex h-12 -translate-y-1/2 items-center justify-center sm:inset-x-3"
      style={{ top: `${positionPercent}%` }}
    >
      {isPaper ? null : (
        <span className="absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent blur-md" />
      )}
      <span
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${
          isPaper
            ? "h-[3px] bg-gradient-to-r from-red-600/15 via-[#e43d30] to-red-600/15 shadow-[0_2px_0_rgba(255,255,255,0.58),0_5px_12px_rgba(135,38,29,0.16)]"
            : "h-1 bg-gradient-to-r from-cyan-200/15 via-cyan-200 to-cyan-200/15 shadow-[0_0_5px_rgba(165,243,252,0.98),0_0_18px_rgba(165,243,252,0.74)]"
        }`}
      />
      <time
        dateTime={now.toISOString()}
        className={`relative z-10 min-w-24 rounded-full px-3 py-2 text-center font-mono text-[10px] font-bold tracking-[0.08em] sm:min-w-28 sm:px-4 sm:text-xs ${
          isPaper
            ? "bg-[#e43d30] text-[#fffaf0] shadow-[0_5px_16px_rgba(135,38,29,0.28)]"
            : "bg-cyan-200 text-[#031013] shadow-[0_0_28px_rgba(165,243,252,0.82)]"
        }`}
      >
        NOW {currentTime}
      </time>
    </span>
  );
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
  const [sessionSkinOverrides, setSessionSkinOverrides] = useState<
    Record<string, MeetingSkin>
  >({});
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const swipeAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const selectedDay = meetingDays[selectedDayIndex] ?? meetingDays[1];
  const skinOverridesSnapshot = useSyncExternalStore(
    subscribeToSkinOverrides,
    getSkinOverridesSnapshot,
    getServerSkinOverridesSnapshot,
  );
  const skinOverrides = parseSkinOverrides(skinOverridesSnapshot);
  const selectedDayKey = selectedDay?.start ?? "default";
  const activeSkin =
    sessionSkinOverrides[selectedDayKey] ??
    skinOverrides[selectedDayKey] ??
    getMeetingSkinForDate(selectedDayKey);
  const isPaper = activeSkin === "paper";
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

  function rotateSkin() {
    const nextSkin = getNextMeetingSkin(activeSkin);
    setSessionSkinOverrides((overrides) => ({
      ...overrides,
      [selectedDayKey]: nextSkin,
    }));
    saveSkinOverride(selectedDayKey, nextSkin);
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
      className={`relative flex min-h-[620px] w-full max-w-5xl touch-pan-y select-none flex-col overflow-hidden border p-6 transition-colors duration-500 sm:min-h-[680px] sm:p-10 ${
        isPaper
          ? "paper-planner-board rounded-[20px] border-[#d7c9ac] text-[#24221d] shadow-[0_28px_90px_rgba(75,55,25,0.3)]"
          : "meeting-board rounded-[36px] border-white/10 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)]"
      }`}
    >
      {isPaper ? null : (
        <div className="absolute inset-0 opacity-60">
          <div className="fine-grid h-full w-full" />
        </div>
      )}

      <div className="relative flex flex-1 flex-col">
        <div
          className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b pb-4 ${
            isPaper ? "border-[#524836]/20" : "border-white/15"
          }`}
        >
          <button
            type="button"
            onClick={rotateDay}
            aria-label={`Show next day. Currently ${DAY_LABELS[selectedDayIndex]}`}
            className={`flex min-w-0 touch-manipulation flex-col items-center rounded-xl px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${
              isPaper
                ? "hover:bg-[#524836]/5 focus-visible:outline-[#e43d30]/70 active:bg-[#524836]/10"
                : "hover:bg-white/5 focus-visible:outline-cyan-200/70 active:bg-white/10"
            }`}
          >
            <p
              className={`whitespace-nowrap text-base font-bold uppercase tracking-[0.12em] sm:text-lg sm:tracking-[0.16em] ${
                isPaper
                  ? "font-serif text-[#24221d]"
                  : "font-mono text-cyan-100"
              }`}
            >
              {DAY_LABELS[selectedDayIndex]}
              <span
                className={`ml-2 sm:ml-3 ${
                  isPaper ? "text-[#766c5b]" : "text-white/85"
                }`}
              >
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
                      ? isPaper
                        ? "bg-[#e43d30]"
                        : "bg-cyan-200"
                      : isPaper
                        ? "bg-[#524836]/20"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={rotateSkin}
              aria-label={`Change skin. Current skin is ${activeSkin}`}
              className={`rounded-full border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-[10px] ${
                isPaper
                  ? "border-[#b52f26]/35 bg-[#e43d30]/10 text-[#b52f26] hover:bg-[#e43d30]/18 focus-visible:outline-[#e43d30]/70"
                  : "border-cyan-200/25 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/18 focus-visible:outline-cyan-200/70"
              }`}
            >
              Skin · {isPaper ? "Paper" : "Aurora"}
            </button>
            <div className="text-right font-mono uppercase">
              <p
                className={`text-[10px] tracking-[0.1em] sm:text-xs sm:tracking-[0.14em] ${
                  isPaper ? "text-[#766c5b]" : "text-white/70"
                }`}
              >
                Last snapshot{" "}
                <time
                  dateTime={syncedAt}
                  className={`font-bold ${
                    isPaper ? "text-[#b52f26]" : "text-amber-100"
                  }`}
                >
                  {snapshotTime}
                </time>
              </p>
            </div>
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
            {meetingSchedules.map((meetings, dayIndex) => {
              const currentTimeMarker =
                dayIndex === 1 ? getCurrentTimeMarker(meetings, now) : null;

              return (
                <div
                  key={meetingDays[dayIndex].start}
                  aria-hidden={dayIndex !== selectedDayIndex}
                  className={`flex h-full w-full shrink-0 flex-col overflow-y-auto ${
                    isPaper ? "gap-0 py-2" : "gap-2 py-3 sm:gap-3"
                  }`}
                >
                  {meetings.length > 0 ? (
                    <>
                      {meetings.map((meeting, meetingIndex) => {
                        const meetingKey = `${meeting.id}-${meeting.start}`;
                        const isTitleVisible =
                          revealedMeetingKey === meetingKey;
                        const isNextMeeting =
                          nextMeeting?.id === meeting.id &&
                          nextMeeting.start === meeting.start;
                        const hasEnded =
                          Date.parse(meeting.end) <= now.getTime();
                        const responseBadge = getResponseBadge(
                          meeting.responseStatus,
                        );
                        const currentTimeLinePosition =
                          currentTimeMarker?.meetingIndex === meetingIndex
                            ? currentTimeMarker.positionPercent
                            : null;
                        const meetingContentOpacity = hasEnded
                          ? "opacity-30"
                          : isNextMeeting
                            ? "opacity-100"
                            : "opacity-65";
                        const isPaperHighlight =
                          isPaper &&
                          (isNextMeeting || currentTimeLinePosition !== null);

                        return (
                          <button
                            key={meetingKey}
                            type="button"
                            tabIndex={
                              dayIndex === selectedDayIndex ? 0 : -1
                            }
                            aria-label="Hold to show meeting title"
                            onContextMenu={(event) => event.preventDefault()}
                            onPointerDown={(event) => {
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              setRevealedMeetingKey(meetingKey);
                            }}
                            onPointerUp={(event) => {
                              if (
                                event.currentTarget.hasPointerCapture(
                                  event.pointerId,
                                )
                              ) {
                                event.currentTarget.releasePointerCapture(
                                  event.pointerId,
                                );
                              }
                              setRevealedMeetingKey(null);
                            }}
                            onPointerCancel={() =>
                              setRevealedMeetingKey(null)
                            }
                            onLostPointerCapture={() =>
                              setRevealedMeetingKey(null)
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === " " ||
                                event.key === "Enter"
                              ) {
                                setRevealedMeetingKey(meetingKey);
                              }
                            }}
                            onKeyUp={() => setRevealedMeetingKey(null)}
                            onBlur={() => setRevealedMeetingKey(null)}
                            className={`relative grid w-full touch-pan-y select-none grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-3 text-left [-webkit-touch-callout:none] sm:gap-7 ${
                              isPaper
                                ? `border-b border-[#524836]/15 px-2 last:border-b-0 sm:px-3 ${
                                    isNextMeeting
                                      ? "py-6 sm:py-8"
                                      : "py-4 sm:py-5"
                                  } ${
                                    isPaperHighlight
                                      ? "before:absolute before:inset-y-3 before:-left-3 before:w-1.5 before:rounded-full before:bg-[#e43d30]"
                                      : ""
                                  }`
                                : isNextMeeting
                                  ? "px-2 py-6 sm:px-3 sm:py-8"
                                  : "border-b border-white/8 px-2 py-4 last:border-b-0 sm:px-3 sm:py-5"
                            }`}
                          >
                            {currentTimeLinePosition !== null ? (
                              <CurrentTimeLine
                                now={now}
                                positionPercent={currentTimeLinePosition}
                                skin={activeSkin}
                              />
                            ) : null}
                            {isTitleVisible ? (
                              <span
                                className={`pointer-events-none absolute inset-0 z-10 flex items-center rounded-2xl border px-5 shadow-[0_14px_40px_rgba(0,0,0,0.3)] backdrop-blur-md sm:px-7 ${
                                  isPaper
                                    ? "border-[#b52f26]/20 bg-[#f2ead8]/95"
                                    : "border-cyan-200/20 bg-[#07151c]/95"
                                }`}
                              >
                                <span>
                                  <span
                                    className={`block font-mono text-[9px] uppercase tracking-[0.24em] sm:text-xs ${
                                      isPaper
                                        ? "text-[#b52f26]/65"
                                        : "text-cyan-200/55"
                                    }`}
                                  >
                                    Meeting title
                                  </span>
                                  <span
                                    className={`mt-1 line-clamp-2 block text-xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl ${
                                      isPaper
                                        ? "font-serif text-[#24221d]"
                                        : "text-white"
                                    }`}
                                  >
                                    {meeting.title}
                                  </span>
                                </span>
                              </span>
                            ) : null}
                            <div className={meetingContentOpacity}>
                              <p
                                className={`whitespace-nowrap font-medium tracking-[-0.05em] ${
                                  isPaper
                                    ? `font-serif ${
                                        isPaperHighlight
                                          ? "text-[#b52f26]"
                                          : "text-[#24221d]"
                                      }`
                                    : "font-mono text-white/88"
                                } ${
                                  isNextMeeting
                                    ? "text-3xl sm:text-4xl"
                                    : "text-2xl sm:text-3xl"
                                }`}
                              >
                                {meetingTimeFormatter.format(
                                  new Date(meeting.start),
                                )}
                                <span
                                  className={`mx-2 ${
                                    isPaper
                                      ? "text-[#766c5b]/40"
                                      : "text-white/20"
                                  }`}
                                >
                                  -
                                </span>
                                {meetingTimeFormatter.format(
                                  new Date(meeting.end),
                                )}
                                {responseBadge ? (
                                  <span
                                    className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 align-middle font-mono text-[9px] font-bold leading-none tracking-[0.06em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.28)] sm:ml-3 sm:text-[10px] ${responseBadge.className}`}
                                  >
                                    <span className="size-1 rounded-full bg-current" />
                                    {responseBadge.label}
                                  </span>
                                ) : null}
                                {isNextMeeting &&
                                countdownMinutes !== null ? (
                                  <span
                                    className={`ml-3 inline-flex items-start gap-2 rounded-full border px-3 py-1 align-middle font-mono sm:ml-4 sm:px-4 ${
                                      isUrgentCountdown
                                        ? "border-red-400/35 bg-red-400/12"
                                        : isPaper
                                          ? "border-[#e43d30]/30 bg-[#e43d30]/10"
                                          : "border-cyan-300/25 bg-cyan-300/10"
                                    }`}
                                  >
                                    <span
                                      className={`text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${
                                        isUrgentCountdown
                                          ? "text-red-300/70"
                                        : isPaper
                                          ? "text-[#b52f26]/65"
                                          : "text-cyan-200/55"
                                      }`}
                                    >
                                      Starts in
                                    </span>
                                    <span
                                      className={`text-3xl font-bold leading-none tracking-[-0.06em] sm:text-5xl ${
                                        isUrgentCountdown
                                          ? "urgent-countdown"
                                        : isPaper
                                          ? "text-[#b52f26]"
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
                              className={`whitespace-nowrap text-right font-semibold tracking-[-0.05em] ${
                                isPaper
                                  ? `font-mono ${
                                      isPaperHighlight
                                        ? "text-[#b52f26]"
                                        : "text-[#24221d]"
                                    }`
                                  : "font-mono text-amber-200"
                              } ${meetingContentOpacity} ${getLocationTextSizeClass(
                                meeting.location,
                                isNextMeeting,
                              )}`}
                            >
                              {meeting.location ?? "--"}
                            </p>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p
                        className={`text-2xl sm:text-4xl ${
                          isPaper
                            ? "font-serif text-[#766c5b]/55"
                            : "font-mono text-white/32"
                        }`}
                      >
                        No meetings
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
