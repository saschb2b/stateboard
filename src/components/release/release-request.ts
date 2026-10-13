"use client";

export async function releaseRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const body: unknown = await response.json().catch(() => ({}));
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
  return body as T;
}
