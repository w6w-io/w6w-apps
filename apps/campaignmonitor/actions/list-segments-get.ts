import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/lists/{listid}/segments.json` — the segments defined on one
 * list. **List-level.**
 *
 * The per-list narrowing of `client-segments-get`; same `{ListID, SegmentID,
 * Title}` shape.
 *
 * A `SegmentID` from here is what `campaign-create` takes in `SegmentIDs`, and
 * the vendor's warning applies to both: "When sending to segments, to ensure
 * they have finished calculating, we recommend waiting approximately one hour
 * after importing subscribers, creating segments, or updating segment rules."
 */
interface Input {
  listId: string;
}

interface SegmentSummary {
  ListID: string;
  SegmentID: string;
  Title: string;
}

const listSegmentsGet: ActionDefinition<Input, SegmentSummary[]> = {
  key: "list-segments-get",
  type: "search",
  resource: "list",
  title: "Get List Segments",
  description: "List the segments defined on one subscriber list.",
  params: [listIdParam],
  output: [
    { key: "ListID", type: "string", label: "List ID" },
    { key: "SegmentID", type: "string", label: "Segment ID" },
    { key: "Title", type: "string", label: "Segment title" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<SegmentSummary[]>(
      `/lists/${encodeId(input.listId)}/segments`,
    );
  },
};

export default listSegmentsGet;
