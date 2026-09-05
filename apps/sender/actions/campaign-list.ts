import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage, toList } from "../lib/client.ts";
import { campaignStatusOptions } from "../lib/params.ts";

/**
 * `GET /v2/campaigns` — all campaigns, optionally filtered by status.
 *
 * The vendor's own worked example filters by a single `status=DRAFT`; its
 * table types `status` as `array`, so this sends every selected status as a
 * repeated `status[]=` query entry (see `lib/client.ts` on that convention)
 * rather than assuming only one value is ever accepted.
 */
interface Input {
  limit?: number;
  status?: string[] | string;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List all campaigns, optionally filtered by status.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "How many records per page.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: campaignStatusOptions,
    },
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/campaigns", {
      query: { limit: input.limit, status: toList(input.status) },
    });
  },
};

export default campaignList;
