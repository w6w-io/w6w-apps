import type { ActionDefinition } from "@w6w/types";
import { NutshellClient, type NutshellEntity, toId } from "../lib/client.ts";

interface Input {
  accountId: string | number;
}

/** `getAccount(accountId, rev?)` — one Account (company) by ID. */
const getAccount: ActionDefinition<Input, NutshellEntity> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: 'Fetch one Account (company — called "Companies" in the Nutshell UI) by ID.',
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Account)" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new NutshellClient(ctx).call<NutshellEntity>("getAccount", {
      accountId: toId(input.accountId),
    });
  },
};

export default getAccount;
