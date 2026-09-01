import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { accountOutput } from "../lib/params.ts";

interface Input {
  accountId: number;
  include?: string[];
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: 'Fetch a single account (Freshsales\'s "Sales Account") by ID.',
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      advanced: true,
      hint: "Embed additional details in the response.",
      options: [
        { value: "owner", label: "Owner" },
        { value: "creater", label: "Creator" },
        { value: "updater", label: "Updater" },
        { value: "territory", label: "Territory" },
      ],
    },
  ],
  output: accountOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource(
      "sales_account",
      `/sales_accounts/${input.accountId}`,
      { query: { include: input.include?.length ? input.include.join(",") : undefined } },
    );
  },
};

export default accountGet;
