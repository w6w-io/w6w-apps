import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { accountIdParam, type ListInput, listParams, listQuery } from "../lib/params.ts";

interface Input extends ListInput {
  accountId: string;
}

const accountSubAccountList: ActionDefinition<Input> = {
  key: "account-sub-account-list",
  type: "search",
  resource: "sub-account",
  title: "List Sub-Accounts",
  description:
    'Retrieve all sub-accounts (called "Clients" in the Unbounce app) for the given account.',
  params: [accountIdParam, ...listParams()],
  output: [
    { key: "sub_accounts", type: "array", label: "Sub-Accounts" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/accounts/${encodeId(input.accountId)}/sub_accounts`,
      listQuery(input),
    );
  },
};

export default accountSubAccountList;
