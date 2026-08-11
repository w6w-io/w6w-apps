import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/campaigns/{campaignid}/unschedule.json` — cancel a scheduled
 * send and move the campaign back to drafts. **Campaign-level.**
 *
 * This is the only way to stop a campaign that `campaign-send` has scheduled,
 * and it works **only before sending starts**: "If the campaign is already sent
 * or in the process of sending, this operation will fail" with code 341.
 *
 * `idempotent: true` — the end state is "not scheduled" either way. A second
 * call answers code 341, which the client surfaces verbatim rather than
 * swallowing, because that same code also means "it already went out", and those
 * are very different pieces of news.
 *
 * The response is a bare `200 OK`.
 */
interface Input {
  campaignId: string;
}

const campaignUnschedule: ActionDefinition<Input, { CampaignID: string }> = {
  key: "campaign-unschedule",
  type: "perform",
  resource: "campaign",
  title: "Unschedule Campaign",
  description:
    "Cancel a scheduled campaign and return it to drafts. Fails with code 341 if it is not " +
    "scheduled — which also covers 'it has already started sending'.",
  idempotent: true,
  params: [campaignIdParam],
  output: [{ key: "CampaignID", type: "string", label: "Campaign that was unscheduled" }],

  async execute(input, ctx) {
    await new CampaignMonitorClient(ctx).json(
      `/campaigns/${encodeId(input.campaignId)}/unschedule`,
      { method: "POST" },
    );
    return { CampaignID: input.campaignId };
  },
};

export default campaignUnschedule;
