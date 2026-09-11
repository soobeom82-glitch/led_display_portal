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
  source: "tesla-live" | "tesla-fallback";
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}

export interface CalendarEventRange {
  start: string;
  end: string;
  events: CalendarEvent[];
}

export interface CalendarSyncPayload {
  timezone: "Asia/Seoul";
  generatedAt: string;
  today: CalendarEventRange;
  upcoming: CalendarEventRange;
}

export interface CalendarDisplayState extends CalendarSyncPayload {
  source: "google-apps-script" | "unavailable";
  message?: string;
}

export interface DisplayPayload {
  time: string;
  timezone: string;
  tesla: TeslaDisplayState;
  calendar: CalendarDisplayState;
  meta: {
    source: TeslaDisplayState["source"];
    updatedAt: string;
    message?: string;
  };
}
