import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";

/**
 * `GET /rest/v2/campaigns/{campaign_id}/sequences` — the sequences in a campaign.
 *
 * The lookup Add Contacts to Sequence depends on. Keap's own note:
 * "Retrieves a list of Sequences (**published**) for a Campaign" — an unpublished
 * campaign lists nothing, which reads identically to a campaign with no
 * sequences.
 *
 * ## The response advertises a cursor this endpoint cannot accept
 *
 * `ListCampaignSequenceResponse` carries `next_page_token`, and the operation
 * declares exactly one parameter: `campaign_id`. There is no `page_size` and no
 * `page_token` to feed the cursor back into, so a campaign with more sequences
 * than one page holds cannot be fully enumerated through this endpoint. The
 * token is surfaced anyway rather than dropped, because a non-empty value is
 * the only signal that the list is truncated.
 */
interface Input {
  campaignId: string;
}

const campaignSequenceList: ActionDefinition<Input> = {
  key: "campaign-sequence-list",
  type: "read",
  title: "List Campaign Sequences",
  resource: "campaign",
  description: "List the published sequences inside a campaign, with their contact counts.",
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Only published campaigns list sequences; an unpublished one returns an empty list.",
    },
  ],
  output: [
    { key: "sequences", type: "array", label: "Sequences" },
    { key: "count", type: "number", label: "Sequences returned" },
    { key: "truncated", type: "boolean", label: "More sequences exist than were returned" },
  ],

  async execute(input, ctx) {
    const client = new KeapClient(ctx);
    const body = await client.json<{ sequences?: unknown[]; next_page_token?: string }>(
      `${V2}/campaigns/${encodeId(input.campaignId)}/sequences`,
    );
    const sequences = body?.sequences ?? [];
    return {
      sequences,
      count: sequences.length,
      // No parameter exists to page with, so this can only be reported.
      truncated: Boolean(body?.next_page_token),
    };
  },
};

export default campaignSequenceList;
