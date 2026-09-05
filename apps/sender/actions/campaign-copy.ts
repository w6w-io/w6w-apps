import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `POST /v2/campaigns/{id}/copy` — duplicates a campaign. */
interface Input {
  id: string;
}

const campaignCopy: ActionDefinition<Input> = {
  key: "campaign-copy",
  type: "perform",
  resource: "campaign",
  title: "Copy Campaign",
  description: "Create a copy of the specified campaign.",
  idempotent: false,
  params: [{ key: "id", label: "Campaign ID to copy", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "New campaign ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}/copy`, {
      method: "POST",
    });
  },
};

export default campaignCopy;
