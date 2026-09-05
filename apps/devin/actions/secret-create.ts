import type { ActionDefinition } from "@w6w/types";
import { compact, DevinClient } from "../lib/client.ts";
import { secretTypeOptions } from "../lib/params.ts";

/**
 * `SecretResponse` — never carries `value`: Devin's own create response omits
 * it entirely (verified against the embedded schema, 2026-09-05), so a
 * created secret cannot be echoed back into a run's log or a downstream step
 * even by accident.
 */
interface SecretResponse {
  secret_id: string;
  key: string | null;
  secret_type: string;
  is_sensitive: boolean;
  access_type: "org" | "personal";
  note: string | null;
  created_at: number;
  created_by: string;
}

/**
 * `POST /v3/organizations/{org_id}/secrets` — create an org-level secret a
 * session can reference by id (`session-create`'s `secretIds`) without the
 * value ever appearing in a workflow's params.
 */
interface Input {
  key: string;
  type: string;
  value: string;
  isSensitive?: boolean;
  note?: string;
}

const secretCreate: ActionDefinition<Input, SecretResponse> = {
  key: "secret-create",
  type: "perform",
  resource: "secret",
  title: "Create Secret",
  description: "Create an org-level secret. The value is never returned by this or any other call.",
  idempotent: false,
  params: [
    { key: "key", label: "Key", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: secretTypeOptions,
      default: "key-value",
    },
    { key: "value", label: "Value", type: "secret", required: true },
    {
      key: "isSensitive",
      label: "Sensitive",
      type: "boolean",
      default: true,
      hint: "Sensitive secrets are masked in Devin's own session logs.",
    },
    { key: "note", label: "Note", type: "string", advanced: true },
  ],
  output: [
    { key: "secret_id", type: "string", label: "Secret ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "secret_type", type: "string", label: "Type" },
    { key: "is_sensitive", type: "boolean", label: "Sensitive" },
    { key: "access_type", type: "string", label: "org or personal" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<SecretResponse>("/secrets", {
      method: "POST",
      body: compact({
        key: input.key,
        type: input.type,
        value: input.value,
        is_sensitive: input.isSensitive,
        note: input.note,
      }),
    });
  },
};

export default secretCreate;
