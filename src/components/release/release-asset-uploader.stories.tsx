import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ReleaseAssetUploader } from "./release-asset-uploader";
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ReleaseAssetUploader,
  tags: ["ai-generated"],
  args: { assets: [], upload: fn(async () => {}) },
} satisfies Meta<typeof ReleaseAssetUploader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
