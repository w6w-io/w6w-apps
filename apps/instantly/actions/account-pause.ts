import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/** `POST /api/v2/accounts/{email}/pause` — stop a sending account from sending. */
interface Input {
  email: string;
}

const accountPause: ActionDefinition<Input> = {
  key: "account-pause",
  type: "perform",
  resource: "account",
  title: "Pause Sending Account",
  description: "Pause a single sending account.",
  idempotent: true,
  params: [accountEmailParam],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/accounts/${encodeURIComponent(input.email)}/pause`,
      { method: "POST" },
    );
  },
};

export default accountPause;
