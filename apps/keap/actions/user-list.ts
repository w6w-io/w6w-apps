import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/users` — List Users.
 *
 * The lookup three other actions in this app depend on: Create Task requires
 * `assigned_to_user_id`, Create Note requires `user_id`, and Send Email takes
 * `user_id` as one of its two sender forms. None of them has a default, so this
 * is where their ids come from.
 *
 * ## Inactive users are hidden by default, and that is usually wrong for a lookup
 *
 * `include_inactive` and `include_partners` are boolean filter clauses that
 * default to off, so a task assigned to a since-deactivated user resolves to an
 * id this list will not explain. Both are exposed.
 *
 * `order_by=name` sorts by **family** name and uses the user id as a tiebreaker
 * "for stable pagination" — Keap's own note, and the only place in this API
 * where a sort's tiebreaker is documented at all.
 */
interface Input {
  email?: string;
  givenName?: string;
  includeInactive?: boolean;
  includePartners?: boolean;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  title: "List Users",
  resource: "user",
  description: "List the Keap users on the account — the source of the ids tasks, notes and " +
    "emails are attributed to.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "givenName", label: "First name", type: "string" },
    {
      key: "includeInactive",
      label: "Include deactivated users",
      type: "boolean",
      hint: "Off by default, matching the API. Turn it on to resolve an id on an old task.",
    },
    { key: "includePartners", label: "Include partner users", type: "boolean" },
    filterParam,
    orderByParam(
      "One of `create_time`, `email`, `name`, plus `asc` or `desc`. `name` sorts by family name.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("email", input.email),
      eq("given_name", input.givenName),
      // Boolean clauses, sent only when switched on: the vendor's documented
      // default for both is off, so an explicit `false` says nothing extra.
      input.includeInactive ? "include_inactive==true" : undefined,
      input.includePartners ? "include_partners==true" : undefined,
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ users?: unknown[]; next_page_token?: string }>(`${V2}/users`, {
      query: {
        filter,
        order_by: input.orderBy,
        page_size: input.pageSize,
        page_token: input.pageToken,
      },
    });
    const users = body?.users ?? [];
    return { users, count: users.length, nextPageToken: nextPageToken(body) };
  },
};

export default userList;
