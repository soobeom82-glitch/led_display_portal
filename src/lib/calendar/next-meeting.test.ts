import assert from "node:assert/strict";
import test from "node:test";
import {
  compactMeetingLocation,
  findNextMeeting,
  formatMeetingCountdown,
} from "./next-meeting.ts";
import type { CalendarEvent } from "../types.ts";

const now = new Date("2026-09-11T01:00:00.000Z");

function event(input: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "meeting@example.com",
    title: "주간 회의",
    start: "2026-09-11T02:30:00.000Z",
    end: "2026-09-11T03:00:00.000Z",
    allDay: false,
    location: "B7RW1",
    description: "",
    ...input,
  };
}

test("selects the nearest future timed meeting", () => {
  const result = findNextMeeting(
    [
      event({ id: "later", start: "2026-09-11T05:00:00.000Z" }),
      event({ id: "past", start: "2026-09-11T00:30:00.000Z" }),
      event({ id: "next" }),
    ],
    now,
  );

  assert.equal(result?.id, "next");
  assert.equal(result?.minutesUntil, 90);
  assert.equal(result?.startsIn, "1.5h");
  assert.equal(result?.location, "B7RW1");
});

test("ignores all-day events", () => {
  const result = findNextMeeting([event({ allDay: true })], now);
  assert.equal(result, null);
});

test("normalizes an empty location and short countdown", () => {
  const result = findNextMeeting(
    [event({ start: "2026-09-11T01:45:00.000Z", location: "  " })],
    now,
  );

  assert.equal(result?.startsIn, "45m");
  assert.equal(result?.location, null);
  assert.equal(formatMeetingCountdown(60), "1h");
});

test("shows only the final room token from a long location", () => {
  assert.equal(compactMeetingLocation("판교아지트 7층 B7-R11"), "B7-R11");
  assert.equal(compactMeetingLocation("판교아지트 / (B7RW1)"), "B7RW1");
  assert.equal(
    compactMeetingLocation("판교아지트 B동-7-lzone-B7-R11 (8)"),
    "B7-R11",
  );
  assert.equal(compactMeetingLocation(""), null);
});
