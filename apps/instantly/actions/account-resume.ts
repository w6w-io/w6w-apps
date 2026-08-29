import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/** `POST /api/v2/accounts/{email}/resume` — resume a paused sending account. */
interface Input {
  email: string;
}

const accountResume: ActionDefinition<Input> = {
  key: "account-resume",
  type: "perform",
  resource: "account",
  title: "Resume Sending Account",
  description: "Resume a paused sending account.",
  idempotent: true,
  params: [accountEmailParam],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/accounts/${encodeURIComponent(input.email)}/resume`,
      { method: "POST" },
    );
  },
};

export default accountResume;
