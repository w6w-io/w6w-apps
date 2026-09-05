import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import {
  compact,
  envelopeOutput,
  expandParam,
  expandQuery,
  filtersParam,
  filtersQuery,
  paginationParams,
  paginationQuery,
  sortParams,
  sortQuery,
} from "../lib/params.ts";

interface Input {
  filters: string[];
  expand?: string[];
  sort?: string;
  sortDescending?: boolean;
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/gifts/search.json`. */
const giftSearch: ActionDefinition<Input> = {
  key: "gift-search",
  type: "search",
  resource: "gift",
  title: "Search Gifts",
  description: "Search gifts across every constituent. Confirmed filter field: 'updated_from' " +
    '(e.g. "updated_from=2016-01-01"). Confirmed sort fields: name, gift_amount, date, ' +
    "date_created, date_updated, fund, appeal, campaign, gift_type.",
  params: [
    filtersParam("updated_from=2016-01-01"),
    expandParam([
      "external_constituent_id",
      "constituent_is_org",
      "first_name",
      "last_name",
      "org_name",
      "phone_numbers",
      "email_addresses",
      "street_addresses",
    ]),
    ...sortParams([
      "name",
      "gift_amount",
      "date",
      "date_created",
      "date_updated",
      "fund",
      "appeal",
      "campaign",
      "gift_type",
    ]),
    ...paginationParams(),
  ],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list("/gifts/search", {
      filters: filtersQuery(input),
      query: compact({
        expand: expandQuery(input),
        sort: sortQuery(input),
        ...paginationQuery(input),
      }),
    });
  },
};

export default giftSearch;
