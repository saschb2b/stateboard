"use client";

/** Read the shared REST response shape and keep transport errors actionable. */
export async function clientRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      "Could not reach StateBoard. Check your connection and try again.",
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Unable to complete this action. Try again.",
    );
  }
  if (body === null && response.status !== 204)
    throw new Error(
      "StateBoard returned an unreadable response. Reload before trying again.",
    );
  return body as T;
}
