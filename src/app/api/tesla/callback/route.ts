import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/tesla/oauth";
import { saveTeslaTokens } from "@/lib/tesla/token-store";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const cookieState = request.cookies.get("tesla_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(
      new URL(`/display?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/display?error=invalid_state", request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/display?error=missing_code", request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTeslaTokens(tokens);

    const response = NextResponse.redirect(
      new URL("/display?oauth=connected", request.url),
    );
    response.cookies.delete("tesla_oauth_state");
    return response;
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "token_exchange_failed";

    return NextResponse.redirect(
      new URL(
        `/display?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
