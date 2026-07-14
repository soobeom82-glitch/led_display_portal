import { NextRequest, NextResponse } from "next/server";
import { getDisplayPayload } from "@/lib/display";
import { getAppEnv } from "@/lib/env";

function hasValidDisplayKey(request: NextRequest, expectedKey: string) {
  const headerKey = request.headers.get("x-display-key");
  const queryKey = request.nextUrl.searchParams.get("key");

  return headerKey === expectedKey || queryKey === expectedKey;
}

export async function GET(request: NextRequest) {
  const env = getAppEnv();

  if (env.displayApiKey && !hasValidDisplayKey(request, env.displayApiKey)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "Provide the display key using the x-display-key header or ?key= query string.",
      },
      { status: 401 },
    );
  }

  const payload = await getDisplayPayload();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
