export const STUDY_PHRASES = [
  "bro remembered he's unemployed",
  "bro is fighting unemployment",
  "bro saw his GPA",
  "cooking...",
  "locked tf in",
  "this mf is locked in",
  "bro is onto something",
  "cooking fr",
  "wallahi building his future",
  "shooting for the moon",
  "bro got a family to feed",
] as const;

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Keep the phrase stable when the same timestamp has a different ISO format. */
export function getStudyPhrase(sessionKey: string): (typeof STUDY_PHRASES)[number] {
  const timestamp = Date.parse(sessionKey);
  const seed = Number.isFinite(timestamp) ? String(timestamp) : sessionKey;
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }

  return STUDY_PHRASES[(hash >>> 0) % STUDY_PHRASES.length];
}

export function isLongStudy(elapsedMs: number): boolean {
  return elapsedMs > TWO_HOURS_MS;
}
