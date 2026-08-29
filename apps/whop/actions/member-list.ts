import type { ActionDefinition } from "@w6w/types";
import { resolveAccountId, WhopClient, type WhopPage } from "../lib/client.ts";
import {
  accountIdParam,
  createdWindowParams,
  createdWindowQuery,
  cursorParams,
  cursorQuery,
  sortParams,
} from "../lib/params.ts";

/**
 * `GET /members` — one buyer's relationship with an account, regardless of
 * how many memberships they hold.
 *
 * `query` also matches an exact email address, but only when the credential
 * holds the `member:email:read` scope — a narrower key silently searches name
 * and username only rather than erroring.
 */
interface Input {
  accountId?: string;
  accessLevel?: string;
  status?: string;
  query?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: string;
  direction?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List an account's members, one row per buyer regardless of membership count.",
  params: [
    accountIdParam,
    {
      key: "accessLevel",
      label: "Access level",
      type: "select",
      options: [
        { value: "customer", label: "Customer" },
        { value: "admin", label: "Admin (team member)" },
        { value: "no_access", label: "No access (every grant lapsed)" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "joined", label: "Joined" },
        { value: "left", label: "Left" },
      ],
    },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Search by name or username. An exact email match also works with the " +
        "member:email:read scope.",
    },
    ...createdWindowParams,
    ...sortParams(["created_at", "joined_at", "last_accessed_at", "usd_total_spent"], "created_at"),
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Members" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).get<WhopPage<unknown>>("/members", {
      account_id: resolveAccountId(input.accountId, ctx),
      access_level: input.accessLevel,
      status: input.status,
      query: input.query,
      order: input.order,
      direction: input.direction,
      ...createdWindowQuery(input),
      ...cursorQuery(input),
    });
  },
};

export default memberList;
