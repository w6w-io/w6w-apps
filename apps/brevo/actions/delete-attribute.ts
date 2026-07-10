import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

type Category = "normal" | "transactional" | "category" | "calculated" | "global";

interface Input {
  category: Category;
  name: string;
}

const deleteAttribute: ActionDefinition<Input> = {
  key: "delete-attribute",
  type: "perform",
  resource: "attribute",
  title: "Delete Attribute",
  description: "Delete a contact attribute.",
  idempotent: true,
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
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    await client.request(
      `/contacts/attributes/${input.category}/${encodeURI(input.name)}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteAttribute;
