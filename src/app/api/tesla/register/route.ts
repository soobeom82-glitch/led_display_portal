import { NextRequest, NextResponse } from "next/server";
import { registerTeslaPartnerAccount } from "@/lib/tesla/partner";

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/display";

  try {
    await registerTeslaPartnerAccount({ requestUrl: request.url });

    return NextResponse.redirect(
      new URL(`${redirectTo}?registered=connected`, request.url),
    );
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? (caughtError.message.trim() || "partner_registration_failed")
        : "partner_registration_failed";

    return NextResponse.redirect(
      new URL(
        `${redirectTo}?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
