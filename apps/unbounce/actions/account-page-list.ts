import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { accountIdParam, type ListInput, listParams, listQuery } from "../lib/params.ts";

interface Input extends ListInput {
  accountId: string;
}

const accountPageList: ActionDefinition<Input> = {
  key: "account-page-list",
  type: "search",
  resource: "page",
  title: "List Pages by Account",
  description: "Retrieve all pages for the given account, across every sub-account.",
  params: [accountIdParam, ...listParams()],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/accounts/${encodeId(input.accountId)}/pages`,
      listQuery(input),
    );
  },
};

export default accountPageList;
