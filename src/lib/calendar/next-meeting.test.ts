import assert from "node:assert/strict";
import test from "node:test";
import {
  compactMeetingLocation,
  findMeetingAlert,
  findNextMeetingSchedule,
  formatMeetingLocation,
  getMeetingSchedule,
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
  assert.equal(alert?.location, "B7-R11 (8)");
});

test("shows only the current room during the first half of a meeting", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T10:15:00.000Z"),
  );

  assert.equal(alert?.id, "first");
  assert.equal(alert?.phase, "in-progress");
  assert.equal(alert?.minutesUntil, null);
  assert.equal(alert?.location, "B7-R11 (8)");
});

test("prioritizes the next meeting during its 30-minute window", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T10:30:00.000Z"),
  );

  assert.equal(alert?.id, "second");
  assert.equal(alert?.phase, "upcoming");
  assert.equal(alert?.minutesUntil, 30);
  assert.equal(alert?.location, "B7-R12 (8)");
});

test("shows only the second room while the second meeting is in progress", () => {
  const alert = findMeetingAlert(
    consecutiveMeetings,
    new Date("2026-09-11T11:30:00.000Z"),
  );

  assert.equal(alert?.id, "second");
  assert.equal(alert?.phase, "in-progress");
  assert.equal(alert?.minutesUntil, null);
  assert.equal(alert?.location, "B7-R12 (8)");
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

test("labels Google Meet events with and without a physical room", () => {
  assert.equal(formatMeetingLocation("", true), "화상");
  assert.equal(
    formatMeetingLocation("판교아지트 B동-7-lzone-B7-R11 (8)", true),
    "B7-R11 (8) · 화상",
  );
  assert.equal(formatMeetingLocation("", false), null);
});

test("builds a chronological timed schedule without calendar details", () => {
  const allDay = {
    ...consecutiveMeetings[0],
    id: "all-day",
    allDay: true,
  };
  const schedule = getMeetingSchedule([
    consecutiveMeetings[1],
    allDay,
    consecutiveMeetings[0],
  ]);

  assert.deepEqual(schedule, [
    {
      id: "first",
      title: "first 회의",
      start: "2026-09-11T10:00:00.000Z",
      end: "2026-09-11T11:00:00.000Z",
      location: "B7-R11 (8)",
    },
    {
      id: "second",
      title: "second 회의",
      start: "2026-09-11T11:00:00.000Z",
      end: "2026-09-11T12:00:00.000Z",
      location: "B7-R12 (8)",
    },
  ]);
});

test("finds the next timed meeting and returns its remaining whole minutes", () => {
  const nextMeeting = findNextMeetingSchedule(
    consecutiveMeetings,
    new Date("2026-09-11T10:15:30.000Z"),
  );

  assert.equal(nextMeeting?.id, "second");
  assert.equal(nextMeeting?.minutesUntil, 45);
  assert.equal(nextMeeting?.location, "B7-R12 (8)");
});

test("returns no next meeting after the final meeting starts", () => {
  assert.equal(
    findNextMeetingSchedule(
      consecutiveMeetings,
      new Date("2026-09-11T11:00:00.000Z"),
    ),
    null,
  );
});
