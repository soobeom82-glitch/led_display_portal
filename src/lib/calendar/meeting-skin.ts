export const MEETING_SKINS = ["aurora", "paper"] as const;

export type MeetingSkin = (typeof MEETING_SKINS)[number];

export function isMeetingSkin(value: unknown): value is MeetingSkin {
  return MEETING_SKINS.includes(value as MeetingSkin);
}

export function getMeetingSkinForDate(dateKey: string): MeetingSkin {
  let hash = 2166136261;

  for (const character of dateKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return MEETING_SKINS[(hash >>> 0) % MEETING_SKINS.length];
}

export function getNextMeetingSkin(skin: MeetingSkin): MeetingSkin {
  const currentIndex = MEETING_SKINS.indexOf(skin);
  return MEETING_SKINS[(currentIndex + 1) % MEETING_SKINS.length];
}
