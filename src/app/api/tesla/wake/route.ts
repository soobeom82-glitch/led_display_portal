import { NextRequest, NextResponse } from "next/server";
import { wakeTeslaVehicle } from "@/lib/tesla/client";

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/display";

  try {
    const wakeResult = await wakeTeslaVehicle();
    const params = new URLSearchParams({
      wake: "sent",
      vehicle: wakeResult.vehicleName,
    });

    return NextResponse.redirect(
      new URL(`${redirectTo}?${params.toString()}`, request.url),
    );
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? (caughtError.message.trim() || "tesla_wake_failed")
        : "tesla_wake_failed";

    return NextResponse.redirect(
      new URL(`${redirectTo}?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
