type StorageMode = "file" | "kv";

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAppEnv() {
  const clientId = process.env.TESLA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TESLA_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.TESLA_REDIRECT_URI?.trim() ?? "";
  const kvReady =
    Boolean(process.env.KV_REST_API_URL) && Boolean(process.env.KV_REST_API_TOKEN);

  return {
    teslaClientId: clientId,
    teslaClientSecret: clientSecret,
    teslaRedirectUri: redirectUri,
    teslaAuthBaseUrl:
      process.env.TESLA_AUTH_BASE_URL?.trim() ??
      "https://auth.tesla.com/oauth2/v3",
    teslaApiBaseUrl:
      process.env.TESLA_API_BASE_URL?.trim() ??
      "https://fleet-api.prd.na.vn.cloud.tesla.com",
    teslaVehicleId: process.env.TESLA_VEHICLE_ID?.trim() ?? "",
    teslaScope:
      process.env.TESLA_SCOPE?.trim() ?? "offline_access vehicle_device_data",
    teslaRefreshToken: process.env.TESLA_REFRESH_TOKEN?.trim() ?? "",
    displayApiKey: process.env.DISPLAY_API_KEY?.trim() ?? "",
    displayTimezone: process.env.DISPLAY_TIMEZONE?.trim() ?? "Asia/Seoul",
    displayPollSeconds: parseNumber(process.env.DISPLAY_POLL_SECONDS, 60),
    storageMode: (kvReady ? "kv" : "file") as StorageMode,
    isTeslaOauthConfigured:
      clientId.length > 0 && clientSecret.length > 0 && redirectUri.length > 0,
  };
}
