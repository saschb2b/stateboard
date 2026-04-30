import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

/**
 * Orama-powered docs search. Index is built at compile time from MDX,
 * served from this route handler. Fully client/server local — no
 * external service, safe in airgapped deployments.
 */
export const { GET } = createFromSource(source);
