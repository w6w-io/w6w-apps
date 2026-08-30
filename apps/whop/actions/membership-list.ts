import type { ActionDefinition } from "@w6w/types";
import { resolveAccountId, WhopClient, type WhopPage } from "../lib/client.ts";
import {
  accountIdParam,
  createdWindowParams,
  createdWindowQuery,
  cursorParams,
  cursorQuery,
  membershipStatusOptions,
  sortParams,
} from "../lib/params.ts";

/**
 * `GET /memberships` — every membership the caller can read.
 *
 * An account API key sees its own account's memberships; a user credential
 * sees their own plus every account they manage. `accountId`/`userId` only
 * NARROW that set — a value outside the caller's reach returns fewer results,
 * never an error (per the vendor's own description).
 */
interface Input {
  accountId?: string;
  userId?: string;
  status?: string;
  productId?: string;
  planId?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: string;
  direction?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const membershipList: ActionDefinition<Input> = {
  key: "membership-list",
  type: "search",
  resource: "membership",
  title: "List Memberships",
  description: "List memberships, optionally narrowed by account, user, product, plan or status.",
  params: [
    accountIdParam,
    { key: "userId", label: "User ID", type: "string", placeholder: "user_xxxxxxxxxxxxxx" },
    { key: "status", label: "Status", type: "select", options: membershipStatusOptions },
    { key: "productId", label: "Product ID", type: "string", placeholder: "prod_xxxxxxxxxxxxxx" },
    { key: "planId", label: "Plan ID", type: "string", placeholder: "plan_xxxxxxxxxxxxxx" },
    ...createdWindowParams,
    ...sortParams(["created_at"], "created_at"),
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Memberships" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).get<WhopPage<unknown>>("/memberships", {
      account_id: resolveAccountId(input.accountId, ctx),
      user_id: input.userId,
      status: input.status,
      product_id: input.productId,
      plan_id: input.planId,
      order: input.order,
      direction: input.direction,
      ...createdWindowQuery(input),
      ...cursorQuery(input),
    });
  },
};

export default membershipList;
