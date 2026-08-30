import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, subAccountIdParam } from "../lib/params.ts";

interface Input extends ListInput {
  subAccountId: string;
}

const subAccountPageList: ActionDefinition<Input> = {
  key: "sub-account-page-list",
  type: "search",
  resource: "page",
  title: "List Pages by Sub-Account",
  description: "Retrieve all pages for a given sub-account.",
  params: [subAccountIdParam, ...listParams()],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/sub_accounts/${encodeId(input.subAccountId)}/pages`,
      listQuery(input),
    );
  },
};

export default subAccountPageList;
