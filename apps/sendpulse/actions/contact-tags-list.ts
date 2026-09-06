import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  name?: string;
  search?: string;
}

/** `GET /crm/v1/contact-tags` — tag id, name and the number of contacts carrying it. */
const action: ActionDefinition<Input> = {
  key: "contact-tags-list",
  type: "search",
  resource: "contact",
  title: "List contact tags",
  description: "List contact tags, optionally filtered by exact or partial name match.",
  params: [
    { key: "name", label: "Name (exact match)", type: "string" },
    { key: "search", label: "Name contains", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const query = compact({ name: input.name, search: input.search });
    return await new SendPulseClient(ctx).crm("/contact-tags", { query });
  },
};

export default action;
