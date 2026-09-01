import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
  includeAssociatedContacts?: boolean;
}

const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Retrieve a single deal by ID.",
  params: [
    { key: "id", label: "Deal ID", type: "number", required: true },
    {
      key: "includeAssociatedContacts",
      label: "Include associated contacts",
      type: "boolean",
      hint: "Adds ?includes=associated_contacts.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "value", type: "string", label: "Value" },
  ],

  async execute(input, ctx) {
    const suffix = input.includeAssociatedContacts ? "?includes=associated_contacts" : "";
    return await new SellClient(ctx).get(`/deals/${encodeURIComponent(String(input.id))}${suffix}`);
  },
};

export default dealGet;
