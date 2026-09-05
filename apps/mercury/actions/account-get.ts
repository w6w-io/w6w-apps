import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/** `GET /account/{accountId}` — a single account by ID. `operationId: getAccount`. */
interface Input {
  accountId: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve a single Mercury account by ID.",
  params: [accountIdParam],
  output: [{ key: "account", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const account = await new MercuryClient(ctx).json(
      `/account/${encodeURIComponent(input.accountId)}`,
    );
    return { account };
  },
};

export default accountGet;
