import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

interface Input {
  leadId: string;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description:
    "Retrieve a single lead by its own id, without needing to know which page it came from.",
  params: [leadIdParam],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "page_id", type: "string", label: "Page ID" },
    { key: "form_data", type: "object", label: "Submitted form data" },
    { key: "extra_data", type: "object", label: "Extra data from third-party integrations" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/leads/${encodeId(input.leadId)}`);
  },
};

export default leadGet;
