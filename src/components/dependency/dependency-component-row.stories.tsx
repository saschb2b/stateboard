import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { DependencyComponentRow } from "./dependency-component-row";

const example = getReleaseDemo();
const component = example.product.components[0]!;
const meta = {
  component: DependencyComponentRow,
  tags: ["ai-generated"],
  args: {
    component,
    expanded: false,
    onExpand: fn(),
    checks: [],
    readiness: example.readiness,
    outcomeLinks: example.product.capabilityComponents.filter(
      (item) => item.componentId === component.id,
    ),
    scope: example.detail.scope,
    dependencies: example.product.dependencies.filter(
      (item) => item.consumerId === component.id,
    ),
    componentName: (id: string) =>
      example.product.components.find((item) => item.id === id)?.name ??
      "Unavailable component",
  },
} satisfies Meta<typeof DependencyComponentRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = {};
export const WiringDetails: Story = { args: { expanded: true } };
export const OwnerNeedsReview: Story = {
  args: { component: { ...component, ownerNeedsReassignment: true } },
};
