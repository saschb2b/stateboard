import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { docsLayoutConfig } from "@/lib/docs-layout-config";
import "./docs.css";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout tree={source.pageTree} {...docsLayoutConfig}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
