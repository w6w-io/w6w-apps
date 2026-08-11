import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/campaigns/{campaignid}/listsandsegments.json` — what a campaign
 * is targeted at. **Campaign-level.**
 *
 * The response is an **object with two arrays**, `{Lists: [{ListID, Name}],
 * Segments: [{ListID, SegmentID, Title}]}` — not a flat list. Because
 * `campaign-create` makes lists and segments mutually exclusive, in practice one
 * of the two is empty; reading it is how you find out which way a draft was
 * built before deciding whether it is safe to send.
 */
interface Input {
  campaignId: string;
}

interface ListsAndSegments {
  Lists: Array<{ ListID: string; Name: string }>;
  Segments: Array<{ ListID: string; SegmentID: string; Title: string }>;
}

const campaignListsAndSegmentsGet: ActionDefinition<Input, ListsAndSegments> = {
  key: "campaign-lists-and-segments-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Lists And Segments",
  description: "Read the lists and segments a campaign is targeted at, as two separate arrays.",
  params: [campaignIdParam],
  output: [
    { key: "Lists", type: "array", label: "Targeted lists" },
    { key: "Segments", type: "array", label: "Targeted segments" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<ListsAndSegments>(
      `/campaigns/${encodeId(input.campaignId)}/listsandsegments`,
    );
  },
};

export default campaignListsAndSegmentsGet;
