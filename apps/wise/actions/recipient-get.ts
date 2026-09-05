import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/** `GET /accounts/{accountId}` — a single recipient account's details. */
interface Input {
  accountId: number;
}

const recipientGet: ActionDefinition<Input> = {
  key: "recipient-get",
  type: "read",
  resource: "recipient",
  title: "Get Recipient",
  description: "Get a single recipient (beneficiary) account by ID.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      required: true,
      hint: "Recipient account ID, from List Recipients or Create Recipient.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "currency", type: "string", label: "Target currency" },
    { key: "accountHolderName", type: "string", label: "Recipient name" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/accounts/${input.accountId}`);
  },
};

export default recipientGet;
