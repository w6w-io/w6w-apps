import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";

interface Input {
  accountId: number;
}

const accountDelete: ActionDefinition<Input> = {
  key: "account-delete",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description: 'Permanently delete an account (Freshsales\'s "Sales Account").',
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    // The docs only show the response body for "Delete a Contact" (the bare
    // JSON literal `true`); this app treats accounts and deals as following
    // the same REST convention rather than a separately verified response.
    const result = await new FreshsalesClient(ctx).request<boolean>(
      `/sales_accounts/${input.accountId}`,
      { method: "DELETE" },
    );
    return { deleted: result === true };
  },
};

export default accountDelete;
