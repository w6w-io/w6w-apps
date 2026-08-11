import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/tags` — the company's whole tag vocabulary.
 *
 * There is no search parameter: filtering is the caller's job. Tags are
 * created implicitly by `photo-tag-add` and `project-label-add`, so this list
 * is also where typos accumulate — reading it before tagging is how a workflow
 * avoids adding "Frontt Side" next to "Front Side".
 */
interface Input {
  page?: number;
  perPage?: number;
}

const tagList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List All Tags",
  description: "List the company's tags. There is no server-side search on this endpoint.",
  params: [...pageParams()],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/tags", { query: paginationQuery(input) });
  },
};

export default tagList;
