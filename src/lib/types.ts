export interface StoredTeslaTokens {
  accessToken?: string;
  refreshToken: string;
  expiresAt?: string;
  scope?: string;
  updatedAt: string;
}

export interface TeslaVehicleSummary {
  id?: number;
  id_s?: string;
  vin?: string;
  display_name?: string;
  state?: string;
}

export interface TeslaChargeState {
  battery_level?: number;
  charge_limit_soc?: number;
  charging_state?: string;
  time_to_full_charge?: number;
}

export interface TeslaVehicleData {
  display_name?: string;
  state?: string;
  charge_state?: TeslaChargeState;
}

export interface TeslaApiEnvelope<T> {
  response: T;
}

export interface TeslaDisplayState {
  battery: number | null;
  charging: boolean;
  limit: number | null;
  minutesRemaining: number | null;
  status: string;
  complete: boolean;
  vehicleName: string | null;
  source: "mock" | "tesla-live" | "tesla-fallback";
}

export interface DisplayPayload {
  time: string;
  timezone: string;
  tesla: TeslaDisplayState;
  meta: {
    source: TeslaDisplayState["source"];
    updatedAt: string;
    usingMock: boolean;
    message?: string;
  };
}
