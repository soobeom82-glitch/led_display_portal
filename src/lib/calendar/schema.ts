import type {
  CalendarEvent,
  CalendarEventRange,
  CalendarSyncPayload,
} from "@/lib/types";

const CALENDAR_TIMEZONE = "Asia/Seoul" as const;
const MAX_EVENTS_PER_RANGE = 500;
const MAX_RANGE_DAYS = 31;

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }

  return value;
}

function asIsoDate(value: unknown, field: string) {
  const input = asString(value, field, 40);
  const timestamp = Date.parse(input);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`${field} must be an ISO date.`);
  }

  return new Date(timestamp).toISOString();
}

function parseEvent(value: unknown, index: number, rangeName: string): CalendarEvent {
  const event = asRecord(value, `${rangeName}.events[${index}]`);
  const start = asIsoDate(event.start, `${rangeName}.events[${index}].start`);
  const end = asIsoDate(event.end, `${rangeName}.events[${index}].end`);

  if (Date.parse(end) < Date.parse(start)) {
    throw new Error(`${rangeName}.events[${index}].end must not precede start.`);
  }

  if (typeof event.allDay !== "boolean") {
    throw new Error(`${rangeName}.events[${index}].allDay must be a boolean.`);
  }

  return {
    id: asString(event.id, `${rangeName}.events[${index}].id`, 1024),
    title: asString(event.title, `${rangeName}.events[${index}].title`, 1024),
    start,
    end,
    allDay: event.allDay,
    location: asString(
      event.location ?? "",
      `${rangeName}.events[${index}].location`,
      2048,
    ),
    description: asString(
      event.description ?? "",
      `${rangeName}.events[${index}].description`,
      10000,
    ),
  };
}

function parseRange(value: unknown, name: string): CalendarEventRange {
  const range = asRecord(value, name);
  const start = asIsoDate(range.start, `${name}.start`);
  const end = asIsoDate(range.end, `${name}.end`);

  if (Date.parse(end) <= Date.parse(start)) {
    throw new Error(`${name}.end must be after start.`);
  }

  if (Date.parse(end) - Date.parse(start) > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    throw new Error(`${name} cannot exceed ${MAX_RANGE_DAYS} days.`);
  }

  if (!Array.isArray(range.events)) {
    throw new Error(`${name}.events must be an array.`);
  }

  if (range.events.length > MAX_EVENTS_PER_RANGE) {
    throw new Error(`${name}.events cannot exceed ${MAX_EVENTS_PER_RANGE} items.`);
  }

  const events = range.events
    .map((event, index) => parseEvent(event, index, name))
    .sort((left, right) => left.start.localeCompare(right.start));

  return { start, end, events };
}

export function parseCalendarSyncPayload(value: unknown): CalendarSyncPayload {
  const payload = asRecord(value, "payload");

  if (payload.timezone !== CALENDAR_TIMEZONE) {
    throw new Error(`timezone must be ${CALENDAR_TIMEZONE}.`);
  }

  return {
    timezone: CALENDAR_TIMEZONE,
    generatedAt: asIsoDate(payload.generatedAt, "generatedAt"),
    today: parseRange(payload.today, "today"),
    upcoming: parseRange(payload.upcoming, "upcoming"),
    browsing:
      payload.browsing === undefined
        ? undefined
        : parseRange(payload.browsing, "browsing"),
  };
}
