import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

type Category = "normal" | "transactional" | "category" | "calculated" | "global";
type NormalType = "text" | "date" | "float" | "boolean";

interface Input {
  category: Category;
  name: string;
  /** Required when category is `normal`. */
  type?: NormalType;
  /** Required when category is `global` or `calculated`. */
  value?: string;
  /** Required when category is `category` — list of `{value, label}` items. */
  enumeration?: Array<{ value: number; label: string }>;
}

/**
 * Type override map — n8n's `INTERCEPTORS` collapses the payload's `type` field
 * per category so callers don't have to know the API mapping:
 *   category      -> type=category
 *   normal        -> type=boolean   (n8n's own quirk; user-picked type is ignored)
 *   transactional -> type=id
 * We follow n8n exactly so behavior is a drop-in.
 */
const CATEGORY_TYPE_OVERRIDE: Partial<Record<Category, string>> = {
  category: "category",
  normal: "boolean",
  transactional: "id",
};

const createAttribute: ActionDefinition<Input> = {
  key: "create-attribute",
  type: "perform",
  resource: "attribute",
  title: "Create Attribute",
  description: "Create a contact attribute (normal / transactional / category / calculated / global).",
  params: [
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      default: "normal",
      options: [
        { value: "normal", label: "Normal" },
        { value: "transactional", label: "Transactional" },
        { value: "category", label: "Category" },
        { value: "calculated", label: "Calculated" },
        { value: "global", label: "Global" },
      ],
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      hint: "Required when category is `normal`.",
      options: [
        { value: "text", label: "Text" },
        { value: "date", label: "Date" },
        { value: "float", label: "Float" },
        { value: "boolean", label: "Boolean" },
      ],
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: "Required when category is `global` or `calculated`.",
    },
    {
      key: "enumeration",
      label: "Category enumeration",
      type: "json",
      hint: "Required when category is `category`. JSON array of `{value, label}`.",
    },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.category === "normal" && input.type) body.type = input.type;
    if (input.category === "global" || input.category === "calculated") {
      if (input.value !== undefined) body.value = input.value;
    }
    if (input.category === "category" && input.enumeration) body.enumeration = input.enumeration;

    const override = CATEGORY_TYPE_OVERRIDE[input.category];
    if (override) body.type = override;

    await client.request(
      `/contacts/attributes/${input.category}/${encodeURI(input.name)}`,
      { method: "POST", body },
    );
    return { success: true };
  },
};

export default createAttribute;
