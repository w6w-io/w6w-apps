import type { ActionDefinition } from "@w6w/types";
import { KommoClient } from "../lib/client.ts";

interface Input {
  id: number;
  withEmbed?: string[];
}

interface Output {
  lead: unknown;
}

/** `GET /api/v4/leads/{id}` — verified against `getting-a-lead-by-its-id`. */
const leadGet: ActionDefinition<Input, Output> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get a Lead",
  description: "Read a single lead by ID.",
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
    {
      key: "withEmbed",
      label: "Embed",
      type: "multiselect",
      options: [
        { value: "contacts", label: "Contacts" },
        { value: "loss_reason", label: "Loss reason" },
        { value: "catalog_elements", label: "Catalog elements" },
        { value: "source_id", label: "Source ID" },
        { value: "is_price_modified_by_robot", label: "Price-changed-by-robot flag" },
      ],
      hint: "Adds this related data to the response.",
    },
  ],
  output: [{ key: "lead", type: "object", label: "The lead" }],

  async execute(input, ctx) {
    const lead = await new KommoClient(ctx).request(`/leads/${input.id}`, {
      query: { with: input.withEmbed?.length ? input.withEmbed.join(",") : undefined },
    });
    return { lead };
  },
};

export default leadGet;
