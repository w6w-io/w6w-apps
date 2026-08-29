import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/** `DELETE /api/v2/accounts/{email}` — returns the now-deleted Account. */
interface Input {
  email: string;
}

const accountDelete: ActionDefinition<Input> = {
  key: "account-delete",
  type: "perform",
  resource: "account",
  title: "Disconnect Sending Account",
  description: "Permanently disconnect a sending account. Returns its last state.",
  idempotent: true,
  params: [accountEmailParam],
  output: [
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/accounts/${encodeURIComponent(input.email)}`, {
      method: "DELETE",
    });
  },
};

export default accountDelete;
