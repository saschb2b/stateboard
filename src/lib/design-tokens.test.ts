import assert from "node:assert/strict";
import test from "node:test";
import { designTokens } from "./design-tokens.ts";

function luminance(hex: string) {
  assert.match(hex, /^#[a-f\d]{6}$/i);
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(foreground: string, background: string) {
  const lightness = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lightness[0]! + 0.05) / (lightness[1]! + 0.05);
}

for (const [mode, colors] of Object.entries(designTokens.colors)) {
  test(`${mode} body, metadata, status, and button text meet AA contrast`, () => {
    for (const background of ["canvas", "surface"] as const) {
      for (const foreground of [
        "text",
        "muted",
        "success",
        "warning",
        "error",
        "info",
      ] as const) {
        assert.ok(
          contrast(colors[foreground], colors[background]) >= 4.5,
          `${foreground} on ${background} must reach 4.5:1`,
        );
      }
    }
    assert.ok(
      contrast(colors.onPrimary, colors.primary) >= 4.5,
      "Primary-button text must reach 4.5:1",
    );
  });
}
