import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `GET /api/v2/campaigns/{id}/sending-status` — WHY a campaign isn't sending,
 * or is sending slower than expected (`daily_limit_met`, `out_of_schedule`,
 * `all_accounts_unhealthy`, `healthy`, …), rather than just its status enum.
 *
 * The vendor's own note: some fields are absent when the campaign is
 * currently out of its sending schedule; `campaign_id`, `last_updated`,
 * `status` and `issue_tracking` are always present.
 */
interface Input {
  id: string;
}

const campaignSendingStatusGet: ActionDefinition<Input> = {
  key: "campaign-sending-status-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Sending Status",
  description: "Explain why a campaign is not sending, or is sending slower than expected.",
  params: [campaignIdParam],
  output: [
    { key: "diagnostics", type: "object", label: "Diagnostics" },
    { key: "summary", type: "string", label: "Human-readable summary" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/campaigns/${encodeURIComponent(input.id)}/sending-status`,
    );
  },
};

export default campaignSendingStatusGet;
