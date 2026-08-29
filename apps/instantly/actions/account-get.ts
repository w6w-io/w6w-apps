import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/** `GET /api/v2/accounts/{email}` — read one sending account. */
interface Input {
  email: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Sending Account",
  description: "Read a single sending account by email.",
  params: [accountEmailParam],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
    { key: "warmup_status", type: "number", label: "Warmup status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/accounts/${encodeURIComponent(input.email)}`);
  },
};

export default accountGet;
