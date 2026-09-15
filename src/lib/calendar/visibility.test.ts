import assert from "node:assert/strict";
import test from "node:test";
import { shouldDisplayCalendarEvent } from "./visibility.ts";

test("hides meetings declined by the current user", () => {
  assert.equal(
    shouldDisplayCalendarEvent({
      title: "주간 회의",
      responseStatus: "no",
    }),
    false,
  );
});

test("hides events whose title contains 휴가", () => {
  assert.equal(
    shouldDisplayCalendarEvent({
      title: "오후 반차 휴가",
      responseStatus: "yes",
    }),
    false,
  );
});

test("keeps accepted, tentative, invited, owner, and legacy events", () => {
  for (const responseStatus of [
    "yes",
    "maybe",
    "invited",
    "owner",
    undefined,
  ] as const) {
    assert.equal(
      shouldDisplayCalendarEvent({ title: "프로젝트 회의", responseStatus }),
      true,
    );
  }
});
