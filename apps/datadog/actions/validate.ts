import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v1/validate` — is this connection's Datadog API key live?
 *
 * Datadog's own purpose-built check, and the only endpoint in the whole surface
 * that needs the API key *alone*: its `security` block is `[{apiKeyAuth: []}]`,
 * with no application key and no authorization scope. So this is the one Action
 * an API-key-only connection can always run.
 *
 * **Read the body, not the status.** This endpoint answers a byte-identical
 * `403 {"errors":["Forbidden"]}` for a missing key, a well-formed fake key and a
 * garbage key, where the rest of the API answers `401` for a missing credential
 * — measured 2026-08-11. Only `200 {"valid": true}` means anything, which is why
 * this action reports `valid` verbatim rather than inferring it from a status.
 *
 * A rejected key raises, so a successful run always carries `valid: true`; the
 * field is returned anyway so a workflow branching on it reads the vendor's own
 * answer rather than this app's interpretation of it.
 */
type Input = Record<string, never>;

const validate: ActionDefinition<Input> = {
  key: "validate",
  type: "read",
  resource: "account",
  title: "Validate API Key",
  description:
    "Check that this connection's Datadog API key is live. Needs no application key and no " +
    "permissions.",
  params: [],
  output: [
    { key: "valid", type: "boolean", label: "API key is valid" },
    { key: "site", type: "string", label: "Datadog site checked" },
  ],

  async execute(_input, ctx) {
    const client = new DatadogClient(ctx);
    const body = await client.json<{ valid?: boolean }>("/api/v1/validate");
    return { valid: body?.valid === true, site: client.site.id };
  },
};

export default validate;
