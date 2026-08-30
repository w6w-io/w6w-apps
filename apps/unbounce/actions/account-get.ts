import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve the details of a single account.",
  params: [accountIdParam],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State (active or suspended)" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/accounts/${encodeId(input.accountId)}`);
  },
};

export default accountGet;
