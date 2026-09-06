import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import {
  asOptionalJson,
  filterParam,
  flattenFilter,
  includeParam,
  pageQuery,
  paginationParams,
  sortParam,
} from "../lib/params.ts";

interface Input {
  filter?: string;
  include?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * `GET /plannings` — verified against developers.booqable.com ("List
 * plannings"). A Planning ties one order line item to a reserved date range
 * (`reserved_from`/`reserved_till`) and a status (`reserved`, `started`,
 * `stopped`) — it's how Booqable answers "what is actually booked". `perform`
 * write endpoints for plannings are deliberately not included: creating or
 * changing one is normally a side effect of booking an order (via
 * `sideposting` on a line/order write), and the docs give plannings no
 * standalone create/update endpoint of their own to call safely.
 */
const planningList: ActionDefinition<Input> = {
  key: "planning-list",
  type: "read",
  resource: "planning",
  title: "List Plannings",
  description: "List plannings (item reservations against a date range), filtered and paged.",
  params: [
    { ...filterParam, hint: filterParam.hint + " Filterable: order_id, item_id, status." },
    { ...includeParam, placeholder: "order,item" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Plannings" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/plannings", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default planningList;
