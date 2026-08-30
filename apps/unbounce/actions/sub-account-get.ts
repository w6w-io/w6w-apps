import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { subAccountIdParam } from "../lib/params.ts";

interface Input {
  subAccountId: string;
}

const subAccountGet: ActionDefinition<Input> = {
  key: "sub-account-get",
  type: "read",
  resource: "sub-account",
  title: "Get Sub-Account",
  description:
    'Retrieve the details of a single sub-account (called a "Client" in the Unbounce app).',
  params: [subAccountIdParam],
  output: [
    { key: "id", type: "string", label: "Sub-Account ID" },
    { key: "account_id", type: "string", label: "Owning account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domains_count", type: "number", label: "Custom domains" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/sub_accounts/${encodeId(input.subAccountId)}`);
  },
};

export default subAccountGet;
