import "server-only";

import { getAppEnv } from "@/lib/env";
import type {
  TeslaApiEnvelope,
  TeslaDisplayState,
  TeslaVehicleData,
  TeslaVehicleSummary,
} from "@/lib/types";
import { refreshTeslaAccessToken } from "@/lib/tesla/oauth";
import { readTeslaTokens, saveTeslaTokens } from "@/lib/tesla/token-store";

async function fetchTeslaJson<T>(
  pathname: string,
  accessToken: string,
  init?: RequestInit,
) {
  const env = getAppEnv();
  const response = await fetch(`${env.teslaApiBaseUrl}${pathname}`, {
    method: init?.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    cache: "no-store",
  });

  const data = (await response.json()) as T & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error_description ??
        data.error ??
        `Tesla API request failed for ${pathname}.`,
    );
  }

  return data;
}

async function getTeslaAccessToken() {
  const storedTokens = await readTeslaTokens();

  if (!storedTokens?.refreshToken) {
    throw new Error(
      "No Tesla refresh token found. Complete /login first or set TESLA_REFRESH_TOKEN.",
    );
  }

  if (storedTokens.accessToken && storedTokens.expiresAt) {
    const expiresAt = new Date(storedTokens.expiresAt).getTime();
    if (expiresAt - Date.now() > 2 * 60 * 1000) {
      return storedTokens.accessToken;
    }
  }

  const refreshed = await refreshTeslaAccessToken(storedTokens.refreshToken);
  await saveTeslaTokens(refreshed);
  return refreshed.accessToken ?? "";
}

function pickVehicle(
  vehicles: TeslaVehicleSummary[],
  preferredVehicleId: string,
) {
  if (preferredVehicleId) {
    const matched = vehicles.find(
      (vehicle) =>
        vehicle.id_s === preferredVehicleId ||
        String(vehicle.id ?? "") === preferredVehicleId ||
        vehicle.vin === preferredVehicleId,
    );

    if (matched) {
      return matched;
    }
  }

  return vehicles[0] ?? null;
}

async function getTeslaVehicleSummary() {
  const env = getAppEnv();
  const accessToken = await getTeslaAccessToken();
  const vehiclesEnvelope = await fetchTeslaJson<TeslaApiEnvelope<TeslaVehicleSummary[]>>(
    "/api/1/vehicles",
    accessToken,
  );
  const vehicle = pickVehicle(vehiclesEnvelope.response, env.teslaVehicleId);

  if (!vehicle) {
    throw new Error("Tesla account does not have any vehicles.");
  }

  return {
    accessToken,
    vehicle,
  };
}

function toMinutesRemaining(hours: number | undefined) {
  if (hours === undefined || Number.isNaN(hours) || hours <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(hours * 60));
}

function mapVehicleDataToDisplay(
  vehicle: TeslaVehicleSummary,
  data: TeslaVehicleData,
): TeslaDisplayState {
  const chargeState = data.charge_state;
  const rawStatus =
    chargeState?.charging_state ?? data.state ?? vehicle.state ?? "Unknown";
  const status =
    rawStatus === "Starting" || rawStatus === "Charging"
      ? "Charging"
      : rawStatus === "Complete"
        ? "Complete"
        : rawStatus === "Disconnected"
          ? "Disconnected"
          : rawStatus === "Stopped"
            ? "Stopped"
            : rawStatus === "asleep"
              ? "Sleeping"
              : rawStatus;
  const complete = status === "Complete";

  return {
    battery: chargeState?.battery_level ?? null,
    charging: status === "Charging",
    limit: chargeState?.charge_limit_soc ?? null,
    minutesRemaining: complete
      ? null
      : toMinutesRemaining(chargeState?.time_to_full_charge),
    status,
    complete,
    vehicleName: data.display_name ?? vehicle.display_name ?? null,
    source: "tesla-live",
  };
}

function buildVehicleFallback(vehicle: TeslaVehicleSummary): TeslaDisplayState {
  return {
    battery: null,
    charging: false,
    limit: null,
    minutesRemaining: null,
    status: vehicle.state === "asleep" ? "Sleeping" : vehicle.state ?? "Offline",
    complete: false,
    vehicleName: vehicle.display_name ?? null,
    source: "tesla-fallback",
  };
}

export async function getTeslaDisplayState() {
  const { accessToken, vehicle } = await getTeslaVehicleSummary();

  const vehicleIdentifier = vehicle.id_s ?? String(vehicle.id ?? "");
  if (!vehicleIdentifier) {
    throw new Error("Unable to determine a Tesla vehicle identifier.");
  }

  try {
    const vehicleDataEnvelope = await fetchTeslaJson<
      TeslaApiEnvelope<TeslaVehicleData>
    >(
      `/api/1/vehicles/${vehicleIdentifier}/vehicle_data?endpoints=charge_state`,
      accessToken,
    );
    return mapVehicleDataToDisplay(vehicle, vehicleDataEnvelope.response);
  } catch {
    return buildVehicleFallback(vehicle);
  }
}

export async function wakeTeslaVehicle() {
  const { accessToken, vehicle } = await getTeslaVehicleSummary();
  const vehicleVin = vehicle.vin?.trim();

  if (!vehicleVin) {
    throw new Error("Unable to determine a Tesla vehicle VIN for wake_up.");
  }

  const wakeResponse = await fetchTeslaJson<TeslaApiEnvelope<TeslaVehicleSummary>>(
    `/api/1/vehicles/${vehicleVin}/wake_up`,
    accessToken,
    {
      method: "POST",
    },
  );

  return {
    vehicleName:
      wakeResponse.response.display_name ?? vehicle.display_name ?? "Tesla vehicle",
    state: wakeResponse.response.state ?? vehicle.state ?? "unknown",
    vin: vehicleVin,
  };
}
