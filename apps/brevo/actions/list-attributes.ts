import type { ActionDefinition } from "@w6w/types";
import { BrevoClient, type BrevoList } from "../lib/client.ts";

interface Input {
  limit?: number;
}

const listAttributes: ActionDefinition<Input> = {
  key: "list-attributes",
  type: "read",
  resource: "attribute",
  title: "List Attributes",
  description: "List all contact attributes defined on the account.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Optional. When omitted, returns every attribute.",
    },
  ],
  output: [
    { key: "attributes", type: "array", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const res = await client.request<BrevoList<"attributes">>("/contacts/attributes");
    if (input.limit && Array.isArray(res.attributes)) {
      return { ...res, attributes: res.attributes.slice(0, input.limit) };
    }
    return res;
  },
};

export default listAttributes;
