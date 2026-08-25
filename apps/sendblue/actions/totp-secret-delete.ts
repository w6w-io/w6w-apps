import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  secretId: string;
}

/** `DELETE /api/v2/totp/secrets/{secret_id}` — permanent. */
const totpSecretDelete: ActionDefinition<Input> = {
  key: "totp-secret-delete",
  type: "perform",
  resource: "totp",
  title: "Delete TOTP Secret",
  description: "Permanently delete a stored TOTP secret.",
  idempotent: true,
  params: [
    { key: "secretId", label: "TOTP secret ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.delete(`/api/v2/totp/secrets/${encodeURIComponent(input.secretId)}`);
  },
};

export default totpSecretDelete;
