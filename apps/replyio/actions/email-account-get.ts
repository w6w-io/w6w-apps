import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";

/**
 * `GET /v3/email-accounts/{id}` — one email account in full: connection,
 * safety limits, signature, opt-out and ramp-up settings, tags, and connection
 * status. Requires `channels:read`.
 */
interface Input {
  id: number;
}

const emailAccountGet: ActionDefinition<Input> = {
  key: "email-account-get",
  type: "read",
  resource: "email-account",
  title: "Get Email Account",
  description: "Fetch one email account in full: connection, safety, signature, opt-out and " +
    "ramp-up settings, tags, and connection status.",
  params: [
    { key: "id", label: "Email Account ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Email account ID" },
    {
      key: "emailAccountType",
      type: "string",
      label: "custom | gmail | outlook | exchange | exchangeOnPremise",
    },
    { key: "isDefault", type: "boolean", label: "Is the default account" },
    { key: "connectionStatus", type: "string", label: "unknown | connected | disconnected" },
    { key: "safety", type: "object", label: "Daily limit and throttling settings" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).json(`/email-accounts/${input.id}`);
  },
};

export default emailAccountGet;
