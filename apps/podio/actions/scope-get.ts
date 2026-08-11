import type { ActionDefinition } from "@w6w/types";
import { PodioClient } from "../lib/client.ts";

/**
 * `GET /oauth/scope` — "Returns the scope of the client, i.e. what references
 * the client has access to and with what permissions (read/write/delete/all)."
 *
 * What this connection is actually allowed to do, from Podio's own mouth. Each
 * entry is `{ref_type, ref_id, permissions, ref_data}`; a global grant is the
 * degenerate `{ref_type: null, ref_id: null, permissions: ["all"]}`.
 *
 * Useful as a branch in a workflow — check for `write` before attempting one —
 * and as the first thing to look at when a call 403s, because a Podio OAuth
 * consent screen lets the user pick *which* orgs, workspaces or apps to grant,
 * and what they picked is invisible everywhere else.
 *
 * It is also both auth methods' liveness probe. It was chosen for that because
 * it requires a credential, works for a user token and an app token alike, is
 * itself unscoped, and returns nothing secret — `auth/app-auth.ts` sets out the
 * measurements.
 */
type Input = Record<string, never>;

const scopeGet: ActionDefinition<Input> = {
  key: "scope-get",
  type: "read",
  resource: "grant",
  title: "Get Granted Scope",
  description:
    "What this connection may reach and with which permissions — the references the user " +
    "picked on Podio's consent screen, or the single app an app connection is locked to.",
  params: [],
  output: [{ key: "scope", type: "array", label: "Granted references and permissions" }],

  async execute(_input, ctx) {
    const scope = await new PodioClient(ctx).json<unknown[]>("/oauth/scope");
    return { scope: scope ?? [] };
  },
};

export default scopeGet;
