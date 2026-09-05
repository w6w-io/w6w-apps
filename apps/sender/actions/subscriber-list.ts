import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/subscribers` — every subscriber in the account, paginated.
 *
 * Sender's `links`/`meta` pagination envelope sits ALONGSIDE `data`, not
 * nested inside it (see `lib/client.ts`), so this reads the whole body via
 * `.json()` rather than `.data()`, which would otherwise drop the pagination
 * metadata this action's `output` declares.
 */
interface Input {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
}

const subscriberList: ActionDefinition<Input> = {
  key: "subscriber-list",
  type: "search",
  resource: "subscriber",
  title: "List Subscribers",
  description: "List all subscribers in the account.",
  params: paginationParams(),
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    { key: "meta", type: "object", label: "Pagination metadata" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/subscribers", {
      query: paginationQuery(input),
    });
  },
};

export default subscriberList;
