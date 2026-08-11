import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, type PagedResult } from "../lib/client.ts";
import { clientIdParam, orderDirectionParam, pagedOutput, pageParams } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/suppressionlist.json` — the client's
 * suppression list, paged. **Client-level.**
 *
 * The suppression list is client-wide: an address on it is refused across every
 * list of that client that uses the `AllClientLists` unsubscribe setting. That
 * is why a `subscriber-add` can fail with code 204 "In Suppression List" for an
 * address that has never been on the list you are adding it to.
 *
 * `SuppressionReason` is one of `Bounced`, `Unsubscribed` or
 * `Reason Unavailable` — the last being the vendor's honest answer for addresses
 * imported or suppressed before it started recording why.
 *
 * `orderfield` here accepts `email` or `date` (not `name`), per the endpoint's
 * own signature; the shared 802 error text mentions `name` because it is
 * reused across endpoints.
 */
interface Input {
  clientId: string;
  page?: number;
  pageSize?: number;
  orderField?: string;
  orderDirection?: string;
}

interface SuppressedAddress {
  SuppressionReason: string;
  EmailAddress: string;
  Date: string;
  State: string;
}

const clientSuppressionListGet: ActionDefinition<Input, PagedResult<SuppressedAddress>> = {
  key: "client-suppression-list-get",
  type: "search",
  resource: "client",
  title: "Get Suppression List",
  description:
    "Read a page of the client-wide suppression list, with each address's suppression reason and " +
    "date.",
  params: [
    clientIdParam,
    ...pageParams(100),
    {
      key: "orderField",
      label: "Order by",
      type: "select",
      options: [
        { value: "email", label: "Email address (the API default)" },
        { value: "date", label: "Date suppressed" },
      ],
    },
    orderDirectionParam,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<PagedResult<SuppressedAddress>>(
      `/clients/${encodeId(input.clientId)}/suppressionlist`,
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

export default clientSuppressionListGet;
