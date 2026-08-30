import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, pageGroupIdParam } from "../lib/params.ts";

interface Input extends ListInput {
  pageGroupId: string;
}

const pageGroupPageList: ActionDefinition<Input> = {
  key: "page-group-page-list",
  type: "search",
  resource: "page",
  title: "List Pages by Page Group",
  description: "Retrieve all pages that belong to a given page group.",
  params: [pageGroupIdParam, ...listParams()],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/page_groups/${encodeId(input.pageGroupId)}/pages`,
      listQuery(input),
    );
  },
};

export default pageGroupPageList;
