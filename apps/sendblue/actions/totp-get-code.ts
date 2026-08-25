import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  secretId: string;
}

/** `GET /api/v2/totp/code/{secret_id}` — the current 6/8-digit TOTP code and its remaining TTL. */
const totpGetCode: ActionDefinition<Input> = {
  key: "totp-get-code",
  type: "read",
  resource: "totp",
  title: "Get Current TOTP Code",
  description: "Generate the current TOTP code for a stored secret, and how long until it " +
    "rotates.",
  params: [
    { key: "secretId", label: "TOTP secret ID", type: "string", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Current code" },
    { key: "expires_in", type: "number", label: "Seconds until rotation" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/api/v2/totp/code/${encodeURIComponent(input.secretId)}`);
  },
};

export default totpGetCode;
