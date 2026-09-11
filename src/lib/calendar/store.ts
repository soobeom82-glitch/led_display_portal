import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAppEnv } from "@/lib/env";
import type { CalendarSyncPayload } from "@/lib/types";

const CALENDAR_STORE_KEY = "google:calendar:default:snapshot";

export interface StoredCalendarSnapshot extends CalendarSyncPayload {
  storedAt: string;
}

function getLocalSnapshotPath() {
  return path.join(process.cwd(), ".data", "google-calendar.json");
}

async function readFromKv() {
  const { kv } = await import("@vercel/kv");
  return (await kv.get<StoredCalendarSnapshot>(CALENDAR_STORE_KEY)) ?? null;
}

async function writeToKv(snapshot: StoredCalendarSnapshot) {
  const { kv } = await import("@vercel/kv");
  await kv.set(CALENDAR_STORE_KEY, snapshot);
}

async function readFromFile() {
  try {
    const contents = await readFile(getLocalSnapshotPath(), "utf8");
    return JSON.parse(contents) as StoredCalendarSnapshot;
  } catch {
    return null;
  }
}

async function writeToFile(snapshot: StoredCalendarSnapshot) {
  const filePath = getLocalSnapshotPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function readCalendarSnapshot() {
  const env = getAppEnv();

  if (env.storageMode === "kv") {
    return readFromKv();
  }

  if (process.env.VERCEL) {
    return null;
  }

  return readFromFile();
}

export async function saveCalendarSnapshot(payload: CalendarSyncPayload) {
  const env = getAppEnv();
  const snapshot: StoredCalendarSnapshot = {
    ...payload,
    storedAt: new Date().toISOString(),
  };

  if (env.storageMode === "kv") {
    await writeToKv(snapshot);
    return snapshot;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Calendar sync on Vercel requires KV_REST_API_URL and KV_REST_API_TOKEN.",
    );
  }

  await writeToFile(snapshot);
  return snapshot;
}
