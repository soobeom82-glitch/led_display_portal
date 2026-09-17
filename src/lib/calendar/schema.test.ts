import assert from "node:assert/strict";
import test from "node:test";
import { parseCalendarSyncPayload } from "./schema.ts";

const basePayload = {
  timezone: "Asia/Seoul",
  generatedAt: "2026-09-11T01:00:00.000Z",
  today: {
    start: "2026-09-10T15:00:00.000Z",
    end: "2026-09-11T15:00:00.000Z",
    events: [],
  },
  upcoming: {
    start: "2026-09-11T01:00:00.000Z",
    end: "2026-09-18T01:00:00.000Z",
    events: [],
  },
  browsing: {
    start: "2026-09-09T15:00:00.000Z",
    end: "2026-09-12T15:00:00.000Z",
    events: [],
  },
};

test("accepts an empty day and preserves the Seoul timezone", () => {
  const parsed = parseCalendarSyncPayload(basePayload);

  assert.equal(parsed.timezone, "Asia/Seoul");
  assert.deepEqual(parsed.today.events, []);
  assert.deepEqual(parsed.browsing?.events, []);
});

test("accepts snapshots created before the browsing range was added", () => {
  const legacyPayload: Record<string, unknown> = { ...basePayload };
  delete legacyPayload.browsing;
  const parsed = parseCalendarSyncPayload(legacyPayload);

  assert.equal(parsed.browsing, undefined);
});

test("normalizes Korean, timed, all-day, recurring, and optional fields", () => {
  const parsed = parseCalendarSyncPayload({
    ...basePayload,
    upcoming: {
      ...basePayload.upcoming,
      events: [
        {
          id: "recurring@example.com",
          title: "점심",
          start: "2026-09-12T12:00:00+09:00",
          end: "2026-09-12T13:00:00+09:00",
          allDay: false,
          responseStatus: "YES",
          videoMeeting: true,
        },
        {
          id: "all-day@example.com",
          title: "사무실",
          start: "2026-09-10T15:00:00.000Z",
          end: "2026-09-11T15:00:00.000Z",
          allDay: true,
          location: "",
          description: "",
        },
        {
          id: "recurring@example.com",
          title: "점심",
          start: "2026-09-13T12:00:00+09:00",
          end: "2026-09-13T13:00:00+09:00",
          allDay: false,
          location: "식당",
          description: "반복 일정",
        },
      ],
    },
  });

  assert.equal(parsed.upcoming.events[0].title, "사무실");
  assert.equal(parsed.upcoming.events[1].title, "점심");
  assert.equal(parsed.upcoming.events[1].start, "2026-09-12T03:00:00.000Z");
  assert.equal(parsed.upcoming.events[1].location, "");
  assert.equal(parsed.upcoming.events[1].responseStatus, "yes");
  assert.equal(parsed.upcoming.events[1].videoMeeting, true);
  assert.equal(parsed.upcoming.events[2].id, "recurring@example.com");
});

test("rejects an unknown calendar response status", () => {
  assert.throws(
    () =>
      parseCalendarSyncPayload({
        ...basePayload,
        today: {
          ...basePayload.today,
          events: [
            {
              id: "meeting@example.com",
              title: "회의",
              start: "2026-09-11T01:00:00.000Z",
              end: "2026-09-11T02:00:00.000Z",
              allDay: false,
              responseStatus: "unknown",
            },
          ],
        },
      }),
    /responseStatus is invalid/,
  );
});

test("rejects an invalid video meeting flag", () => {
  assert.throws(
    () =>
      parseCalendarSyncPayload({
        ...basePayload,
        today: {
          ...basePayload.today,
          events: [
            {
              id: "meeting@example.com",
              title: "회의",
              start: "2026-09-11T01:00:00.000Z",
              end: "2026-09-11T02:00:00.000Z",
              allDay: false,
              videoMeeting: "yes",
            },
          ],
        },
      }),
    /videoMeeting must be a boolean/,
  );
});

test("rejects a non-Seoul timezone", () => {
  assert.throws(
    () => parseCalendarSyncPayload({ ...basePayload, timezone: "UTC" }),
    /timezone must be Asia\/Seoul/,
  );
});
