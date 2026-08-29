import type { ActionDefinition } from "@w6w/types";
import { CannyClient, toList } from "../lib/client.ts";
import { entrySortOptions, entryTypeOptions, skipLimitParams } from "../lib/params.ts";

/** `POST /v1/entries/list` — list changelog entries. */
interface Input {
  labelIDs?: string[] | string;
  limit?: number;
  skip?: number;
  sort?: string;
  type?: string;
}

const entryList: ActionDefinition<Input> = {
  key: "entry-list",
  type: "search",
  resource: "entry",
  title: "List Changelog Entries",
  description: "List changelog entries, optionally filtered by label or type.",
  params: [
    { key: "type", label: "Type", type: "select", options: entryTypeOptions },
    {
      key: "labelIDs",
      label: "Labels",
      type: "string",
      repeat: true,
      hint: "Only entries with at least one of these labels.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: entrySortOptions,
      default: "nonPublishedFirst",
    },
    ...skipLimitParams(10, "Defaults to 10 if not specified."),
  ],
  output: [
    { key: "entries", type: "array", label: "Entries" },
    { key: "hasMore", type: "boolean", label: "More entries beyond this page" },
  ],

  execute(input, ctx) {
    return new CannyClient(ctx).post("/entries/list", {
      labelIDs: toList(input.labelIDs),
      limit: input.limit,
      skip: input.skip,
      sort: input.sort,
      type: input.type,
    });
  },
};

export default entryList;
