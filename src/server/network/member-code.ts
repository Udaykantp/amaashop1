import { randomInt } from "node:crypto";

/**
 * Human-facing referral / member codes: `AMA-XXXXXX` where X is an
 * unambiguous uppercase alphanumeric (no 0/O/1/I/L). Short enough to read off
 * a phone, long enough that guessing is impractical (~29 bits over 6 chars).
 * Uniqueness is still enforced by the DB unique constraint — callers retry on
 * the rare collision.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateMemberCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `AMA-${s}`;
}

const CODE_RE = /^AMA-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

/** Normalise user input (trim, uppercase, tolerate a missing prefix). */
export function normalizeMemberCode(input: string): string | null {
  let s = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!s.startsWith("AMA-")) s = `AMA-${s.replace(/^AMA-?/, "")}`;
  return CODE_RE.test(s) ? s : null;
}

/**
 * One-shot temp password for a Firebase account created by an admin
 * (see `adminCreateDistributor`). Never surfaced to anyone — the account
 * holder sets their own password via the reset link generated alongside it.
 */
export function randomTempPassword(): string {
  let s = "";
  for (let i = 0; i < 24; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}
