import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

// Raw <img src> doesn't get basePath applied; prepend it manually so the
// GitHub Pages build (served under /stateboard/) finds the asset.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Shared Fumadocs layout config for /docs.
 *
 * The diamond mark + wordmark mirrors the AppHeader on the rest of the
 * site so the brand stays consistent when a visitor crosses from the
 * marketing page into the docs.
 */
export const docsLayoutConfig: BaseLayoutProps = {
  nav: {
    title: (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE_PATH}/icon.svg`}
          alt=""
          aria-hidden
          width={18}
          height={18}
          style={{
            display: "inline-block",
            marginRight: 8,
            verticalAlign: "middle",
          }}
        />
        <span
          style={{ fontWeight: 700, letterSpacing: "0.08em", fontSize: 13 }}
        >
          STATEBOARD
        </span>
        <span
          style={{
            color: "var(--color-fd-muted-foreground)",
            margin: "0 6px",
          }}
        >
          /
        </span>
        <span style={{ fontWeight: 500 }}>docs</span>
      </>
    ),
    url: "/docs",
  },
  links: [
    { text: "App", url: "/", active: "nested-url" },
    { text: "Boards", url: "/boards", active: "nested-url" },
    {
      text: "GitHub",
      url: "https://github.com/saschb2b/stateboard",
      external: true,
    },
  ],
  githubUrl: "https://github.com/saschb2b/stateboard",
};
