import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/** `DELETE /api/v2/campaigns/{id}` — returns the now-deleted Campaign. */
interface Input {
  id: string;
}

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Permanently delete a campaign. Returns the deleted campaign's last state.",
  idempotent: true,
  params: [campaignIdParam],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/campaigns/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default campaignDelete;
