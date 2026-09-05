import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { pageTokenParam } from "../lib/params.ts";

/**
 * `GET /api/v1/members` — the team's members. Returns at most 50 per call —
 * page with `nextToken`.
 *
 * Each `TeamUser` in Guru's schema carries a `token` field this action strips
 * before returning — see `lib/client.ts` for why.
 */
interface Input {
  search?: string;
  sortField?: string;
  sortDir?: string;
  userType?: string;
  token?: string;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List the team's members — useful for looking up a verifier or owner by name.",
  params: [
    { key: "search", label: "Search", type: "string" },
    { key: "sortField", label: "Sort field", type: "string", advanced: true },
    { key: "sortDir", label: "Sort direction", type: "string", advanced: true },
    { key: "userType", label: "User type filter", type: "string", advanced: true },
    pageTokenParam,
  ],
  output: [
    { key: "items", type: "array", label: "Members" },
    { key: "nextToken", type: "string", label: "Token for the next page, if any" },
  ],

  async execute(input, ctx) {
    const { items, nextToken } = await new GuruClient(ctx).page<Record<string, unknown>>(
      "/members",
      {
        query: {
          search: input.search,
          sortField: input.sortField,
          sortDir: input.sortDir,
          userType: input.userType,
          token: input.token,
        },
      },
    );
    return { items: items.map(stripTokens), nextToken };
  },
};

export default memberList;
