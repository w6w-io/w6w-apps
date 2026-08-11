import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/segments.json` — every segment across all of
 * the client's lists. **Client-level.**
 *
 * Each entry is `{ListID, SegmentID, Title}`: a segment always belongs to
 * exactly one list, and the `ListID` here is how you find out which. The
 * per-list view of the same data is `list-segments` under
 * `GET /lists/{listid}/segments.json`.
 */
interface Input {
  clientId: string;
}

interface SegmentSummary {
  ListID: string;
  SegmentID: string;
  Title: string;
}

const clientSegmentsGet: ActionDefinition<Input, SegmentSummary[]> = {
  key: "client-segments-get",
  type: "search",
  resource: "client",
  title: "Get Client Segments",
  description: "List every segment across all of a client's lists, with the list each belongs to.",
  params: [clientIdParam],
  output: [
    { key: "ListID", type: "string", label: "List the segment belongs to" },
    { key: "SegmentID", type: "string", label: "Segment ID" },
    { key: "Title", type: "string", label: "Segment title" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<SegmentSummary[]>(
      `/clients/${encodeId(input.clientId)}/segments`,
    );
  },
};

export default clientSegmentsGet;
