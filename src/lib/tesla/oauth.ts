import "server-only";

import { getAppEnv } from "@/lib/env";

interface TeslaTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

function assertTeslaOauthConfig() {
  const env = getAppEnv();

  if (!env.isTeslaOauthConfigured) {
    throw new Error(
      "Tesla OAuth is not fully configured. Set TESLA_CLIENT_ID, TESLA_CLIENT_SECRET, and TESLA_REDIRECT_URI.",
    );
  }

  return env;
}

async function requestTeslaTokens(searchParams: URLSearchParams) {
  const env = assertTeslaOauthConfig();
  searchParams.set("client_id", env.teslaClientId);
  searchParams.set("client_secret", env.teslaClientSecret);

  const response = await fetch(`${env.teslaAuthBaseUrl}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: searchParams,
    cache: "no-store",
  });

  const data = (await response.json()) as TeslaTokenResponse;

  if (!response.ok || !data.refresh_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Tesla token request failed.",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export function buildTeslaLoginUrl(state: string) {
  const env = assertTeslaOauthConfig();
  const url = new URL(`${env.teslaAuthBaseUrl}/authorize`);

  url.searchParams.set("client_id", env.teslaClientId);
  url.searchParams.set("redirect_uri", env.teslaRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", env.teslaScope);
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeCodeForTokens(code: string) {
  const env = assertTeslaOauthConfig();
  const searchParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.teslaRedirectUri,
  });

  return requestTeslaTokens(searchParams);
}

export async function refreshTeslaAccessToken(refreshToken: string) {
  const searchParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return requestTeslaTokens(searchParams);
}
