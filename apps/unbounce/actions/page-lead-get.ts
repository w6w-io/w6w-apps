import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { leadIdParam, pageIdParam } from "../lib/params.ts";

interface Input {
  pageId: string;
  leadId: string;
}

const pageLeadGet: ActionDefinition<Input> = {
  key: "page-lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead by Page",
  description: "Retrieve a single lead scoped to the page it was submitted on.",
  params: [pageIdParam, leadIdParam],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "form_data", type: "object", label: "Submitted form data" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/pages/${encodeId(input.pageId)}/leads/${encodeId(input.leadId)}`,
    );
  },
};

export default pageLeadGet;
