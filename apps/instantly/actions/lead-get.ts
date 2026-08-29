import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/** `GET /api/v2/leads/{id}` — read one lead. */
interface Input {
  id: string;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Read a single lead by ID.",
  params: [leadIdParam],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/leads/${encodeURIComponent(input.id)}`);
  },
};

export default leadGet;
