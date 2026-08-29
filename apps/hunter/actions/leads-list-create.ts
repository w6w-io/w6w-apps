import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/** `POST /v2/leads_lists` — create a new (static) leads list. Free. */
interface Input {
  name: string;
}

const leadsListCreate: ActionDefinition<Input> = {
  key: "leads-list-create",
  type: "perform",
  resource: "leads-list",
  title: "Create Leads List",
  description: "Create a new leads list. Free.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "id, name, leads_count, type, created_at" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/leads_lists", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default leadsListCreate;
