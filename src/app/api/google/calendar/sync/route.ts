import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseCalendarSyncPayload } from "@/lib/calendar/schema";
import { saveCalendarSnapshot } from "@/lib/calendar/store";
import { getAppEnv } from "@/lib/env";

function secretsMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const env = getAppEnv();

  if (!env.googleCalendarSyncSecret) {
    return NextResponse.json(
      { error: "Calendar sync is not configured." },
      { status: 503 },
    );
  }

  const providedSecret = request.headers.get("x-calendar-sync-secret") ?? "";
  if (!secretsMatch(providedSecret, env.googleCalendarSyncSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = parseCalendarSyncPayload(await request.json());
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Invalid payload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const snapshot = await saveCalendarSnapshot(payload);

    return NextResponse.json({
      ok: true,
      storedAt: snapshot.storedAt,
      counts: {
        today: snapshot.today.events.length,
        upcoming: snapshot.upcoming.events.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to store the calendar snapshot." },
      { status: 500 },
    );
  }
}
