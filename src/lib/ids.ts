import { customAlphabet, nanoid } from "nanoid";

/** 12-char id used for internal primary keys (boards, screens, regions). */
export const newId = (): string => nanoid(12);

/**
 * Share-link token used at /share/{token}.
 *
 * Longer than internal ids (24 chars, full nanoid alphabet) because the
 * token is the security boundary for the public read-only artifact —
 * anyone with the token can read the board. 24 chars of nanoid = ~140
 * bits of entropy, well past brute-forcing.
 */
export const newShareToken = (): string => nanoid(24);

/**
 * 8-char URL-safe code, lowercase + digits, used by the migration script
 * when minting share-link tokens for boards imported from a v0 SQLite db
 * (so the friendly "easy to read aloud" property is preserved for those
 * existing links).
 */
const friendlyAlphabet = "abcdefghijkmnpqrstuvwxyz23456789";
const friendlyMaker = customAlphabet(friendlyAlphabet, 12);
export const newFriendlyToken = (): string => friendlyMaker();
