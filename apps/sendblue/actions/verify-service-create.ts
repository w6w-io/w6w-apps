import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  friendlyName: string;
  codeLength?: number;
  ttlSeconds?: number;
  useCustomerLines?: boolean;
}

/**
 * `POST /api/v2/verify/services` — a Verify Service is a named configuration
 * (code length, pending-window TTL, whether to prefer the account's own
 * lines) that one or more Verifications are created against. Service SIDs
 * start with `SV`.
 */
const verifyServiceCreate: ActionDefinition<Input> = {
  key: "verify-service-create",
  type: "perform",
  resource: "verify-service",
  title: "Create Verify Service",
  description: "Create a Sendblue Verify service — configuration shared by the Verifications " +
    "created against it.",
  idempotent: false,
  params: [
    { key: "friendlyName", label: "Friendly name", type: "string", required: true },
    {
      key: "codeLength",
      label: "Code length",
      type: "number",
      default: 6,
      hint: "4–8. Sendblue default: 6.",
    },
    {
      key: "ttlSeconds",
      label: "Pending window (seconds)",
      type: "number",
      default: 300,
      hint: "60–3600. Sendblue default: 300.",
    },
    {
      key: "useCustomerLines",
      label: "Prefer account's own lines",
      type: "boolean",
      default: false,
      hint: "Uses phone numbers already assigned to your account first, falling back to the " +
        "shared Verify pool.",
    },
  ],
  output: [
    { key: "sid", type: "string", label: "Service SID" },
    { key: "url", type: "string", label: "Service URL" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/v2/verify/services",
      compact({
        friendly_name: input.friendlyName,
        code_length: input.codeLength,
        ttl_seconds: input.ttlSeconds,
        use_customer_lines: input.useCustomerLines,
      }),
    );
  },
};

export default verifyServiceCreate;
