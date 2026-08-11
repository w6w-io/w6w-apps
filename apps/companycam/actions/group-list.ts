import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/groups` — the company's user groups.
 *
 * Each row embeds its **full member list** as `User` objects, not ids, so a
 * page of groups is much larger than it looks and every member's email address
 * comes with it.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const groupList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List the company's groups. Each carries its members as full user objects.",
  params: [...pageParams()],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/groups", { query: paginationQuery(input) });
  },
};

export default groupList;
