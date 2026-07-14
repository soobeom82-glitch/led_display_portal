import { NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";

export async function GET() {
  const env = getAppEnv();

  if (!env.teslaPublicKeyPem) {
    return new NextResponse("TESLA_PUBLIC_KEY_PEM is not configured.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new NextResponse(`${env.teslaPublicKeyPem.trim()}\n`, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
