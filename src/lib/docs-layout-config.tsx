import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared Fumadocs layout config for /docs.
 *
 * The wordmark mirrors the AppHeader on the rest of the site so the
 * brand stays consistent when a visitor crosses from the marketing
 * page into the docs.
 */
export const docsLayoutConfig: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            backgroundColor: "var(--color-fd-primary, #F26B2D)",
            borderRadius: 2,
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
