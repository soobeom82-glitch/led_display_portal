import assert from "node:assert/strict";
import test from "node:test";
import {
  compactMeetingLocation,
  findMeetingAlert,
} from "./next-meeting.ts";
import type { CalendarEvent } from "../types.ts";

function meeting(
  id: string,
  start: string,
  end: string,
  location: string,
): CalendarEvent {
  return {
    id,
    title: `${id} 회의`,
    start,
    end,
    allDay: false,
    location,
    description: "",
  };
}

const consecutiveMeetings = [
  meeting(
    "first",
    "2026-09-11T10:00:00.000Z",
    "2026-09-11T11:00:00.000Z",
    "판교아지트 B동-7-lzone-B7-R11 (8)",
  ),
  meeting(
    "second",
    "2026-09-11T11:00:00.000Z",
    "2026-09-11T12:00:00.000Z",
    "판교아지트 B동-7-lzone-B7-R12 (8)",
  ),
];

test("shows nothing until 30 minutes before the first meeting", () => {
  assert.equal(
    findMeetingAlert(
      consecutiveMeetings,
      new Date("2026-09-11T09:29:00.000Z"),
    ),
    null,
  );
});

test("shows the first meeting countdown in minutes from the 30-minute mark", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T09:30:00.000Z"),
  );

  assert.equal(alert?.id, "first");
  assert.equal(alert?.phase, "upcoming");
  assert.equal(alert?.minutesUntil, 30);
  assert.equal(alert?.location, "B7-R11");
});

test("shows only the current room during the first half of a meeting", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T10:15:00.000Z"),
  );

  assert.equal(alert?.id, "first");
  assert.equal(alert?.phase, "in-progress");
  assert.equal(alert?.minutesUntil, null);
  assert.equal(alert?.location, "B7-R11");
});

test("prioritizes the next meeting during its 30-minute window", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T10:30:00.000Z"),
  );

  assert.equal(alert?.id, "second");
  assert.equal(alert?.phase, "upcoming");
  assert.equal(alert?.minutesUntil, 30);
  assert.equal(alert?.location, "B7-R12");
});

test("shows only the second room while the second meeting is in progress", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T11:30:00.000Z"),
  );

  assert.equal(alert?.id, "second");
  assert.equal(alert?.phase, "in-progress");
  assert.equal(alert?.minutesUntil, null);
  assert.equal(alert?.location, "B7-R12");
});

test("shows nothing when the final meeting ends", () => {
  assert.equal(
    findMeetingAlert(
      consecutiveMeetings,
      new Date("2026-09-11T12:00:00.000Z"),
    ),
    null,
  );
});

test("ignores all-day events and normalizes missing rooms", () => {
  const allDay = {
    ...consecutiveMeetings[0],
    allDay: true,
  };
  assert.equal(
    findMeetingAlert([allDay], new Date("2026-09-11T09:45:00.000Z")),
    null,
  );
  assert.equal(compactMeetingLocation(""), null);
});
