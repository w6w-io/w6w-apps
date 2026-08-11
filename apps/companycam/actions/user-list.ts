import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/users` — the company's users.
 *
 * No filter parameters: not by status, not by role. Deleted users have
 * `status: "deleted"` and are filtered client-side or not at all.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const userList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the company's users. The endpoint offers no filters, including by status.",
  params: [...pageParams()],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/users", { query: paginationQuery(input) });
  },
};

export default userList;
