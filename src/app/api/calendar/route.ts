import { NextRequest, NextResponse } from "next/server";
import { getCalendarDisplayState } from "@/lib/calendar/client";
import { getAppEnv } from "@/lib/env";

function hasValidDisplayKey(request: NextRequest, expectedKey: string) {
  const headerKey = request.headers.get("x-display-key");
  const queryKey = request.nextUrl.searchParams.get("key");

  return headerKey === expectedKey || queryKey === expectedKey;
}

export async function GET(request: NextRequest) {
  const env = getAppEnv();

  if (env.displayApiKey && !hasValidDisplayKey(request, env.displayApiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getCalendarDisplayState(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
