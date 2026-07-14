import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAppEnv } from "@/lib/env";
import type { StoredTeslaTokens } from "@/lib/types";

const TOKEN_STORE_KEY = "tesla:oauth:tokens";

function getLocalTokenPath() {
  return path.join(process.cwd(), ".data", "tesla-oauth.json");
}

async function readFromKv() {
  const { kv } = await import("@vercel/kv");
  return (await kv.get<StoredTeslaTokens>(TOKEN_STORE_KEY)) ?? null;
}

async function writeToKv(tokens: StoredTeslaTokens) {
  const { kv } = await import("@vercel/kv");
  await kv.set(TOKEN_STORE_KEY, tokens);
}

async function readFromFile() {
  try {
    const fileContents = await readFile(getLocalTokenPath(), "utf8");
    return JSON.parse(fileContents) as StoredTeslaTokens;
  } catch {
    return null;
  }
}

async function writeToFile(tokens: StoredTeslaTokens) {
  const filePath = getLocalTokenPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(tokens, null, 2), "utf8");
}

export async function readTeslaTokens() {
  const env = getAppEnv();
  const stored =
    env.storageMode === "kv" ? await readFromKv() : await readFromFile();

  if (stored?.refreshToken) {
    return stored;
  }

  if (env.teslaRefreshToken) {
    return {
      refreshToken: env.teslaRefreshToken,
      updatedAt: new Date(0).toISOString(),
    } satisfies StoredTeslaTokens;
  }

  return null;
}

export async function saveTeslaTokens(input: {
  accessToken?: string;
  refreshToken: string;
  expiresIn?: number;
  scope?: string;
}) {
  const env = getAppEnv();
  const now = new Date();
  const expiresAt =
    input.expiresIn && input.expiresIn > 0
      ? new Date(now.getTime() + input.expiresIn * 1000).toISOString()
      : undefined;

  const tokens: StoredTeslaTokens = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt,
    scope: input.scope,
    updatedAt: now.toISOString(),
  };

  if (env.storageMode === "kv") {
    await writeToKv(tokens);
    return tokens;
  }

  await writeToFile(tokens);
  return tokens;
}
