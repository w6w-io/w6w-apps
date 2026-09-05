import type { ActionDefinition } from "@w6w/types";
import { DevinClient } from "../lib/client.ts";

interface SecretResponse {
  secret_id: string;
  key: string | null;
  secret_type: string;
  is_sensitive: boolean;
  access_type: "org" | "personal";
}

/**
 * `DELETE /v3/organizations/{org_id}/secrets/{secret_id}` — delete an
 * org-level secret. Devin returns the deleted secret's own metadata (never
 * its value), which this action passes through as confirmation.
 *
 * `idempotent: true`: the end state after one call and after five is the same
 * secret gone. A repeat call on an already-deleted id surfaces as a `404`
 * rather than being swallowed — worth seeing, since it usually means the id
 * was wrong rather than that the work was already done.
 */
interface Input {
  secretId: string;
}

const secretDelete: ActionDefinition<Input, SecretResponse> = {
  key: "secret-delete",
  type: "perform",
  resource: "secret",
  title: "Delete Secret",
  description: "Delete an org-level secret.",
  idempotent: true,
  params: [
    {
      key: "secretId",
      label: "Secret ID",
      type: "string",
      required: true,
      placeholder: "secret-abc123def456",
    },
  ],
  output: [
    { key: "secret_id", type: "string", label: "Secret ID" },
    { key: "key", type: "string", label: "Key" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<SecretResponse>(
      `/secrets/${encodeURIComponent(input.secretId)}`,
      { method: "DELETE" },
    );
  },
};

export default secretDelete;
