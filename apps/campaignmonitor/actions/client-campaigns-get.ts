import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, type PagedResult } from "../lib/client.ts";
import { clientIdParam, orderDirectionParam, pagedOutput, pageParams } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/campaigns.json` — the client's **sent**
 * campaigns, paged. **Client-level.**
 *
 * Pagination on this endpoint is new in v3.3 — it is the headline item of the
 * 3.2 → 3.3 breaking-change list ("Results are now paginated (limited to 1000
 * entries per API call)"), along with `Tags`, sent-date filtering and sort
 * direction. Code written against 3.2 that expected a bare array gets a
 * `PagedResult` here.
 *
 * The default order is `SentDate` **descending** — most recent first — which is
 * the opposite of most of this API's list endpoints and is what you want for
 * "what went out lately".
 *
 * `tags` is a comma-separated list and is an **AND**: "Sent campaigns with all
 * the tags specified will be returned."
 */
interface Input {
  clientId: string;
  sentFromDate?: string;
  sentToDate?: string;
  tags?: string;
  page?: number;
  pageSize?: number;
  orderDirection?: string;
}

interface SentCampaign {
  CampaignID: string;
  Name: string;
  Subject: string;
  FromName: string;
  FromEmail: string;
  ReplyTo: string;
  SentDate: string;
  TotalRecipients: number;
  Tags?: string[];
  WebVersionURL?: string;
  WebVersionTextURL?: string;
}

const clientCampaignsGet: ActionDefinition<Input, PagedResult<SentCampaign>> = {
  key: "client-campaigns-get",
  type: "search",
  resource: "campaign",
  title: "Get Sent Campaigns",
  description:
    "Read a page of a client's sent campaigns, newest first by default, optionally filtered by " +
    "sent-date range and by tags.",
  params: [
    clientIdParam,
    {
      key: "sentFromDate",
      label: "Sent on or after",
      type: "string",
      placeholder: "2026-01-01",
      hint:
        "YYYY-MM-DD (error 920 otherwise). Omit to go back to the start of the client's history.",
    },
    {
      key: "sentToDate",
      label: "Sent before",
      type: "string",
      placeholder: "2026-12-31",
      hint: "YYYY-MM-DD (error 922 otherwise). Must be after the from date (error 927).",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      placeholder: "2026,promo",
      hint:
        "Comma-separated. This is an AND: only campaigns carrying every tag listed are returned. " +
        "Run Get Client Tags to see what exists.",
    },
    ...pageParams(100),
    {
      ...orderDirectionParam,
      hint: "Sorted by SentDate. The API's own default here is desc — newest first.",
    },
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<PagedResult<SentCampaign>>(
      `/clients/${encodeId(input.clientId)}/campaigns`,
      {
        query: {
          sentFromDate: input.sentFromDate,
          sentToDate: input.sentToDate,
          tags: input.tags,
          page: input.page,
          pagesize: input.pageSize,
          orderdirection: input.orderDirection,
        },
      },
    );
  },
};

export default clientCampaignsGet;
