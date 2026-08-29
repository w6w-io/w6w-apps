import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/**
 * `POST /api/v2/accounts/{email}/mark-fixed` — tell Instantly a sending
 * error (e.g. a connection or auth failure) has been resolved, so it
 * re-attempts sending instead of leaving the account parked in an error
 * state.
 */
interface Input {
  email: string;
}

const accountMarkFixed: ActionDefinition<Input> = {
  key: "account-mark-fixed",
  type: "perform",
  resource: "account",
  title: "Mark Sending Account Fixed",
  description: "Mark a sending account's error as resolved so Instantly resumes sending from it.",
  idempotent: true,
  params: [accountEmailParam],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/accounts/${encodeURIComponent(input.email)}/mark-fixed`,
      { method: "POST" },
    );
  },
};

export default accountMarkFixed;
