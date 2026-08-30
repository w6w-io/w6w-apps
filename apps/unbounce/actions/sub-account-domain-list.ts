import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, subAccountIdParam } from "../lib/params.ts";

interface Input extends ListInput {
  subAccountId: string;
}

const subAccountDomainList: ActionDefinition<Input> = {
  key: "sub-account-domain-list",
  type: "search",
  resource: "domain",
  title: "List Domains",
  description: "Retrieve all custom domains registered under a given sub-account.",
  params: [subAccountIdParam, ...listParams()],
  output: [
    { key: "domains", type: "array", label: "Domains" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(
      `/sub_accounts/${encodeId(input.subAccountId)}/domains`,
      listQuery(input),
    );
  },
};

export default subAccountDomainList;
