import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import { accountEmailParam } from "../lib/params.ts";

/**
 * `PATCH /api/v2/accounts/{email}` — update a sending account's settings.
 * Unlike Create, no IMAP/SMTP fields are accepted here — re-pointing a
 * connected mailbox at different mail servers is not supported by this
 * endpoint.
 */
interface Input {
  email: string;
  first_name?: string;
  last_name?: string;
  daily_limit?: number;
  signature?: string;
  reply_to?: string;
  enable_slow_ramp?: boolean;
  skip_cname_check?: boolean;
  remove_tracking_domain?: boolean;
  warmup?: unknown;
}

const accountPatch: ActionDefinition<Input> = {
  key: "account-patch",
  type: "perform",
  resource: "account",
  title: "Update Sending Account",
  description: "Update a connected sending account's settings.",
  idempotent: true,
  params: [
    accountEmailParam,
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "daily_limit", label: "Daily send limit", type: "number" },
    { key: "signature", label: "Signature (HTML)", type: "text" },
    { key: "reply_to", label: "Reply-to address", type: "string" },
    { key: "enable_slow_ramp", label: "Enable slow ramp", type: "boolean" },
    { key: "skip_cname_check", label: "Skip CNAME check", type: "boolean" },
    { key: "remove_tracking_domain", label: "Remove custom tracking domain", type: "boolean" },
    { key: "warmup", label: "Warmup config (JSON)", type: "json" },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const { email, warmup, ...rest } = input;
    return new InstantlyClient(ctx).json(`/accounts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: {
        ...rest,
        ...(warmup !== undefined ? { warmup: asOptionalJson(warmup, "Warmup config") } : {}),
      },
    });
  },
};

export default accountPatch;
