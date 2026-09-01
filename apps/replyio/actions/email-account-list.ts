import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/email-accounts` — the email accounts you can send from. Requires
 * `channels:read`.
 */
interface Input {
  top?: number;
  skip?: number;
  my?: boolean;
}

const emailAccountList: ActionDefinition<Input> = {
  key: "email-account-list",
  type: "read",
  resource: "email-account",
  title: "List Email Accounts",
  description: "Browse the email accounts you can send from.",
  params: [
    {
      key: "my",
      label: "Only mine",
      type: "boolean",
      hint: "Off by default, matching the API — the list otherwise includes every team member's " +
        "account you can see.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Email accounts" },
    { key: "hasMore", type: "boolean", label: "Whether more accounts exist past this page" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).list("/email-accounts", {
      query: { top: input.top, skip: input.skip, my: input.my },
    });
  },
};

export default emailAccountList;
