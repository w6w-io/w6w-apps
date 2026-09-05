import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam, pageQuery, paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/stores` — every store this account owns. Lemon Squeezy has no
 * `filter[...]` parameters documented for this endpoint.
 */
interface Input {
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const storeList: ActionDefinition<Input> = {
  key: "store-list",
  type: "search",
  resource: "store",
  title: "List Stores",
  description: "List every store on the account.",
  params: [includeParam, ...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Stores" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/stores", {
      query: { include: input.include, ...pageQuery(input) },
    });
  },
};

export default storeList;
