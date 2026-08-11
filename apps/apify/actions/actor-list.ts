import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag } from "../lib/client.ts";
import { descParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/actors` — the Actors this account created or used.
 *
 * "or used" is the part worth reading twice: the list is not just your own
 * Actors, it includes public Store Actors you have run. `my=1` narrows it to
 * ones you own.
 *
 * Sorting by `stats.lastRunStartedAt` is the only alternative to `createdAt`;
 * combined with "newest first" it answers "what did I run most recently".
 */
interface Input {
  my?: boolean;
  sortBy?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const actorList: ActionDefinition<Input> = {
  key: "actor-list",
  type: "search",
  resource: "actor",
  title: "List Actors",
  description: "List the Actors this account has created or used.",
  params: [
    {
      key: "my",
      label: "Only mine",
      type: "boolean",
      hint:
        "Off by default, matching the API — the list otherwise also contains public Actors this " +
        "account has run.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "createdAt", label: "Created at (default)" },
        { value: "stats.lastRunStartedAt", label: "Last run started at" },
      ],
    },
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Actors" },
    { key: "total", type: "number", label: "Total matching Actors" },
    { key: "count", type: "number", label: "Actors in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data<ApifyListPage<unknown>>("/actors", {
      query: {
        my: flag(input.my),
        sortBy: input.sortBy,
        desc: flag(input.desc),
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default actorList;
