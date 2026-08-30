import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/users` — list users, optionally filtered by email.
 *
 * For schools past 10,000 users, `page`/`per` stop working and the pagination
 * guide says to switch to `search_after` (the last user ID on the current
 * page) instead — exposed here as its own param rather than folded into
 * `page`, since the two are mutually exclusive pagination strategies.
 */
interface Input {
  email?: string;
  page?: number;
  per?: number;
  searchAfter?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "Fetch users at the school, optionally filtered by email.",
  params: [
    { key: "email", label: "Email", type: "string" },
    ...paginationParams(20, "Only used below 10,000 users — see Search after cursor."),
    {
      key: "searchAfter",
      label: "Search after (user ID)",
      type: "number",
      advanced: true,
      hint: "For schools with more than 10,000 users: the last user ID from the previous " +
        "page's pagination meta, in place of page/per.",
    },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json("/users", {
      query: {
        email: input.email,
        page: input.page,
        per: input.per ?? 20,
        search_after: input.searchAfter,
      },
    });
  },
};

export default userList;
