import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { CheckFilters } from "./check-filters";

const meta = {
  component: CheckFilters,
  tags: ["ai-generated"],
  args: {
    filters: {
      needsAttention: false,
      result: "all",
      category: "all",
      query: "",
    },
    total: 8,
    shown: 8,
    requiredAttention: 3,
    optionalWarnings: 1,
    onChange: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof CheckFilters>;
export default meta;
type Story = StoryObj<typeof meta>;

function FilterHarness(args: ComponentProps<typeof CheckFilters>) {
  const [filters, setFilters] = useState(args.filters);
  return (
    <CheckFilters
      {...args}
      filters={filters}
      onChange={(patch) => {
        setFilters((current) => ({ ...current, ...patch }));
        args.onChange(patch);
      }}
    />
  );
}

export const ResultAndCategory: Story = {
  render: (args) => <FilterHarness {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "More filters" }));
    await userEvent.click(canvas.getByRole("combobox", { name: "Result" }));
    const document = within(canvasElement.ownerDocument.body);
    await userEvent.click(document.getByRole("option", { name: "missing" }));
    await expect(args.onChange).toHaveBeenCalledWith({ result: "missing" });
    await userEvent.click(canvas.getByRole("combobox", { name: "Category" }));
    await userEvent.click(
      document.getByRole("option", { name: "operational" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith({
      category: "operational",
    });
    await expect(
      canvas.getByRole("button", { name: "Reset filters" }),
    ).toBeVisible();
  },
};
export const OperationsCoverage: Story = { args: { operationsOnly: true } };
