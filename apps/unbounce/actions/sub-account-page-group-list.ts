import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, subAccountIdParam } from "../lib/params.ts";

interface Input extends ListInput {
  subAccountId: string;
}

const subAccountPageGroupList: ActionDefinition<Input> = {
  key: "sub-account-page-group-list",
  type: "search",
  resource: "page-group",
  title: "List Page Groups",
  description:
    "Retrieve all page groups for a given sub-account. Pages may optionally be organized into " +
    "groups.",
  params: [subAccountIdParam, ...listParams()],
  output: [
    { key: "page_groups", type: "array", label: "Page Groups" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/sub_accounts/${encodeId(input.subAccountId)}/page_groups`,
      listQuery(input),
    );
  },
};

export default subAccountPageGroupList;
