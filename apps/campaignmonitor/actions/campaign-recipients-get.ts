import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, type PagedResult } from "../lib/client.ts";
import { campaignIdParam, orderDirectionParam, pagedOutput, pageParams } from "../lib/params.ts";

/**
 * `GET /api/v3.3/campaigns/{campaignid}/recipients.json` — who a campaign was
 * sent to, paged. **Campaign-level.**
 *
 * Each record is `{EmailAddress, ListID}`: a campaign can target several lists,
 * and this is where you find out which list each recipient came from.
 *
 * It is deliberately a separate action from `campaign-interactions-get`. The
 * five interaction reports all take a `date` parameter and order by
 * `email|list|date`; this one takes **no date** and orders by `email|list` only,
 * because a recipient list has no per-record timestamp. Folding it in would mean
 * offering two parameters that this endpoint rejects.
 */
interface Input {
  campaignId: string;
  page?: number;
  pageSize?: number;
  orderField?: string;
  orderDirection?: string;
}

interface Recipient {
  EmailAddress: string;
  ListID: string;
}

const campaignRecipientsGet: ActionDefinition<Input, PagedResult<Recipient>> = {
  key: "campaign-recipients-get",
  type: "search",
  resource: "campaign",
  title: "Get Campaign Recipients",
  description:
    "Read a page of the addresses a campaign was sent to, each with the list it came from.",
  params: [
    campaignIdParam,
    ...pageParams(100),
    {
      key: "orderField",
      label: "Order by",
      type: "select",
      options: [
        { value: "email", label: "Email address" },
        { value: "list", label: "List" },
      ],
      hint: "This endpoint has no date to order by, unlike the interaction reports.",
    },
    orderDirectionParam,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<PagedResult<Recipient>>(
      `/campaigns/${encodeId(input.campaignId)}/recipients`,
      {
        query: {
          page: input.page,
          pagesize: input.pageSize,
          orderfield: input.orderField,
          orderdirection: input.orderDirection,
        },
      },
    );
  },
};

export default campaignRecipientsGet;
