import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

type Category = "calculated" | "category" | "global";

interface Input {
  category: Category;
  name: string;
  value?: string;
  enumeration?: Array<{ value: number; label: string }>;
}

const updateAttribute: ActionDefinition<Input> = {
  key: "update-attribute",
  type: "perform",
  resource: "attribute",
  title: "Update Attribute",
  description: "Update an existing contact attribute (only category/calculated/global).",
  params: [
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      default: "calculated",
      options: [
        { value: "calculated", label: "Calculated" },
        { value: "category", label: "Category" },
        { value: "global", label: "Global" },
      ],
    },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "value", label: "Value", type: "string", hint: "Ignored when category is `category`." },
    {
      key: "enumeration",
      label: "Category enumeration",
      type: "json",
      hint: "JSON array of `{value, label}` — used only when category is `category`.",
    },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.category !== "category" && input.value !== undefined) body.value = input.value;
    if (input.category === "category" && input.enumeration) body.enumeration = input.enumeration;
    return client.request(
      `/contacts/attributes/${input.category}/${encodeURI(input.name)}`,
      { method: "PUT", body },
    );
  },
};

export default updateAttribute;
