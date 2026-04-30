import { NextResponse } from "next/server";

/** Convenience wrappers so route handlers stay terse and consistent. */
export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json(data, init);

export const created = <T>(data: T) => NextResponse.json(data, { status: 201 });

export const noContent = () => new NextResponse(null, { status: 204 });

export const notFound = (message = "Not found") =>
  NextResponse.json({ error: message }, { status: 404 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const serverError = (message = "Internal server error") =>
  NextResponse.json({ error: message }, { status: 500 });
