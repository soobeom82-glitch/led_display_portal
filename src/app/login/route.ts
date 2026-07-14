import { NextResponse } from "next/server";
import { buildTeslaLoginUrl } from "@/lib/tesla/oauth";

export async function GET(request: Request) {
  try {
    const state = crypto.randomUUID();
    const loginUrl = buildTeslaLoginUrl(state);
    const response = NextResponse.redirect(loginUrl);

    response.cookies.set("tesla_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });

    return response;
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? encodeURIComponent(caughtError.message)
        : "oauth_not_configured";

    return NextResponse.redirect(
      new URL(`/display?error=${message}`, request.url),
    );
  }
}
