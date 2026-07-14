import "server-only";

import { getAppEnv } from "@/lib/env";

interface TeslaPartnerTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface TeslaRegisterResponse {
  response?: unknown;
  error?: string;
  error_description?: string;
}

function assertPartnerConfig() {
  const env = getAppEnv();

  if (!env.isTeslaOauthConfigured) {
    throw new Error(
      "Tesla OAuth client configuration is missing. Set TESLA_CLIENT_ID, TESLA_CLIENT_SECRET, and TESLA_REDIRECT_URI.",
    );
  }

  if (!env.hasTeslaPublicKey) {
    throw new Error(
      "TESLA_PUBLIC_KEY_PEM is required before partner registration can run.",
    );
  }

  return env;
}

export function getTeslaAppDomain(requestUrl?: string) {
  const env = getAppEnv();

  if (env.teslaAppDomain) {
    return env.teslaAppDomain;
  }

  if (!requestUrl) {
    throw new Error(
      "TESLA_APP_DOMAIN is required when the app domain cannot be inferred from the incoming request.",
    );
  }

  return new URL(requestUrl).hostname;
}

export async function getTeslaPartnerAccessToken() {
  const env = assertPartnerConfig();
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.teslaClientId,
    client_secret: env.teslaClientSecret,
    audience: env.teslaApiBaseUrl,
  });

  if (env.teslaPartnerScope) {
    params.set("scope", env.teslaPartnerScope);
  }

  const response = await fetch(`${env.teslaPartnerAuthBaseUrl}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  const data = (await response.json()) as TeslaPartnerTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ??
        data.error ??
        "Tesla partner token request failed.",
    );
  }

  return data.access_token;
}

export async function registerTeslaPartnerAccount(args: {
  requestUrl?: string;
  domain?: string;
}) {
  const env = assertPartnerConfig();
  const accessToken = await getTeslaPartnerAccessToken();
  const domain = args.domain ?? getTeslaAppDomain(args.requestUrl);

  const response = await fetch(`${env.teslaApiBaseUrl}/api/1/partner_accounts`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain }),
    cache: "no-store",
  });

  const data = (await response.json()) as TeslaRegisterResponse;

  if (!response.ok) {
    throw new Error(
      data.error_description ??
        data.error ??
        "Tesla partner account registration failed.",
    );
  }

  return {
    domain,
    response: data.response ?? null,
  };
}
