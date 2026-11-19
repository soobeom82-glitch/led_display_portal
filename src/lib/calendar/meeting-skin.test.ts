import assert from "node:assert/strict";
import test from "node:test";
import {
  getMeetingSkinForDate,
  getNextMeetingSkin,
  isMeetingSkin,
  MEETING_SKINS,
} from "./meeting-skin.ts";

test("assigns a stable supported skin to each date", () => {
  const first = getMeetingSkinForDate("2026-11-19T00:00:00+09:00");
  const second = getMeetingSkinForDate("2026-11-19T00:00:00+09:00");

  assert.equal(first, second);
  assert.equal(MEETING_SKINS.includes(first), true);
});

test("distributes both skins across a range of dates", () => {
  const assignedSkins = new Set(
    Array.from({ length: 31 }, (_, day) =>
      getMeetingSkinForDate(`2026-11-${String(day + 1).padStart(2, "0")}`),
    ),
  );

  assert.deepEqual(assignedSkins, new Set(MEETING_SKINS));
});

test("cycles between the available skins", () => {
  assert.equal(getNextMeetingSkin("aurora"), "paper");
  assert.equal(getNextMeetingSkin("paper"), "aurora");
});

test("validates persisted skin values", () => {
  assert.equal(isMeetingSkin("aurora"), true);
  assert.equal(isMeetingSkin("paper"), true);
  assert.equal(isMeetingSkin("terminal"), false);
});
