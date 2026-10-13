import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageMember } from "@/lib/auth-helpers";
import { readProductContext } from "@/lib/db";
import { ProductWorkspace } from "@/components/release/product-workspace";

export const metadata: Metadata = { title: "Product overview" };
export default async function ProductReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requirePageMember("viewer");
  const { id } = await params;
  const product = await readProductContext(id, member.workspaceId);
  if (!product) notFound();
  return <ProductWorkspace initialProduct={product} viewer={member} />;
}
