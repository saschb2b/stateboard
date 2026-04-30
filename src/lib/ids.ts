import { customAlphabet, nanoid } from "nanoid";

/** 12-char id used for internal primary keys (boards, screens, regions). */
export const newId = (): string => nanoid(12);

/**
 * 10-char URL-safe slug used in public share links: /v/{slug}.
 * Lowercase + digits only so links are easy to read aloud.
 */
const slugAlphabet = "abcdefghijkmnpqrstuvwxyz23456789";
const slugMaker = customAlphabet(slugAlphabet, 10);
export const newSlug = (): string => slugMaker();
