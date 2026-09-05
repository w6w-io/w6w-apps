import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `GET /v2/campaigns/{id}` — a single campaign's details. */
interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Get a specific campaign's details.",
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}`);
  },
};

export default campaignGet;
