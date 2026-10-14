import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ProductReleaseList } from "./product-release-list";

const example = getReleaseDemo();
const meta = {
  component: ProductReleaseList,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    onCreate: fn(),
    onSetup: fn(),
  },
} satisfies Meta<typeof ProductReleaseList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LatestAndHistory: Story = {
  args: {
    product: {
      ...example.product,
      releases: [
        example.detail.assessment,
        {
          ...example.detail.assessment,
          id: "earlier",
          candidateLabel: "Earlier candidate",
        },
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Open release review" }),
    ).toHaveAttribute(
      "href",
      `/boards/${example.product.board.id}/releases/${example.detail.assessment.id}`,
    );
    await expect(
      canvas.getByRole("link", { name: "Earlier candidate" }),
    ).toHaveAttribute(
      "href",
      `/boards/${example.product.board.id}/releases/earlier`,
    );
    await expect(
      canvas.queryByText(example.detail.assessment.candidateRef),
    ).toBeNull();
  },
};
export const FirstRelease: Story = {
  args: { product: { ...example.product, releases: [] } },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "New release review" }),
    );
    await expect(args.onCreate).toHaveBeenCalled();
  },
};
export const ViewerEmptyState: Story = {
  args: {
    product: { ...example.product, releases: [], capabilities: [] },
    editable: false,
  },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole("button", { name: "Add features" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "View features" }),
    );
    await expect(args.onSetup).toHaveBeenCalled();
  },
};
