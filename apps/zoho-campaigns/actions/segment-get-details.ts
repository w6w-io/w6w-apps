import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  cvid: string;
}

interface Output {
  data: Record<string, unknown>;
}

/**
 * `GET /getsegmentdetails` — verified against
 * `https://www.zoho.com/campaigns/help/developers/get-segment-details.html`.
 * `cvid` is a segment id, surfaced on a mailing list's own `segments` field
 * from `list-list` — the vendor's own docs call this "You will get cvid from
 * getmailinglists" even though the sample `getmailinglists` response does
 * not show a populated `segments` value, so this app cannot promise a
 * ready-made picker for it.
 */
const segmentGetDetails: ActionDefinition<Input, Output> = {
  key: "segment-get-details",
  type: "read",
  resource: "segment",
  title: "Get Segment Details",
  description: "Get the filter criteria that define a segment of a mailing list.",
  params: [
    listKey,
    {
      key: "cvid",
      label: "Segment ID (cvid)",
      type: "string",
      required: true,
      hint: "From a mailing list's `segments` field (see List Mailing Lists).",
    },
  ],
  output: [{ key: "data", type: "object", label: "Segment details" }],

  async execute(input, ctx) {
    const data = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "getsegmentdetails",
      { query: { listkey: input.listKey, cvid: input.cvid } },
    );
    return { data };
  },
};

export default segmentGetDetails;
