import type { Metadata } from "next";
import { ReleaseWorkspace } from "@/components/release/release-workspace";
import { getReleaseDemo } from "@/lib/release-demo";

export const metadata: Metadata = {
  title: "Release-readiness example",
  description:
    "Explore the same release through product, frontend, backend, QA, operations, and decision views.",
};
export default function ReleaseDemoPage() {
  const { product, detail, now } = getReleaseDemo();
  return (
    <ReleaseWorkspace
      initialProduct={product}
      initialDetail={detail}
      now={now}
      demo
    />
  );
}
