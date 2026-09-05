import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}` — one account's profile: company name, the
 * collection links for its lists and integrations, and its analytics
 * tracking id. Requires only the `account.read` scope.
 */
interface Input {
  accountId: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get one AWeber customer account by id.",
  params: [accountIdParam],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "company", type: "string", label: "Company name" },
    { key: "lists_collection_link", type: "string", label: "Link to this account's lists" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}`,
    );
  },
};

export default accountGet;
