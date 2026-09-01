import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, option lists and secret-stripping helpers for the
 * PhantomBuster actions.
 *
 * Every enum here is copied verbatim from PhantomBuster's own OpenAPI 3.0
 * document (`hub.phantombuster.com/reference`, cross-checked against
 * `github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json`,
 * fetched 2026-09-01), not inferred.
 */

export const idParam: Param = {
  key: "id",
  label: "Agent ID",
  type: "string",
  required: true,
  hint: "The agent's numeric id, as a string. Find it in the PhantomBuster console URL or via " +
    "the agent-list action.",
};

export const containerIdParam: Param = {
  key: "id",
  label: "Container ID",
  type: "string",
  required: true,
  hint: "Take it from the `id` field of a container returned by container-list or agent-launch.",
};

export const agentIdParam: Param = {
  key: "agentId",
  label: "Agent ID",
  type: "string",
  required: true,
  hint: "The agent whose containers to list.",
};

/** `ContainerStatus` — the lifecycle every container / agent-output read reports. */
export const containerStatusOptions = [
  { value: "starting", label: "Starting" },
  { value: "running", label: "Running" },
  { value: "finished", label: "Finished" },
  { value: "unknown", label: "Unknown" },
  { value: "launch error", label: "Launch error" },
  { value: "never launched", label: "Never launched" },
];

/** `LaunchType` — how a container came to exist. */
export const launchTypeOptions = [
  { value: "manual", label: "Manual" },
  { value: "user api call", label: "User API call" },
  { value: "scheduled once", label: "Scheduled once" },
  { value: "scheduled repeatedly", label: "Scheduled repeatedly" },
  { value: "scheduled after agent", label: "Scheduled after another agent" },
  { value: "retry", label: "Retry" },
  { value: "scheduled before", label: "Scheduled before" },
  { value: "browser extension api call", label: "Browser extension API call" },
];

/**
 * The typed, always-present fields on an agent record that carry a live
 * credential. Unlike `argument`/`agentObject` (opaque, per-agent-type JSON
 * strings this client cannot safely parse — see `lib/client.ts`), these are
 * documented, structured fields with no other purpose, so they are dropped
 * outright.
 */
export function stripAgentSecrets<T>(agent: T): T {
  if (!agent || typeof agent !== "object" || Array.isArray(agent)) return agent;
  const out: Record<string, unknown> = { ...(agent as Record<string, unknown>) };
  delete out.proxyPassword;
  return out as T;
}

/**
 * Strip the two fields `GET /orgs/fetch` returns unconditionally that carry a
 * live credential: `identityTokens` (magic-link login tokens for the org) and
 * `qualificationFlow.sessionCookie` (a session cookie pasted during
 * onboarding, when present). `proxies` and `crmIntegrations` are NOT stripped
 * here because this app never requests them in the first place — see
 * `actions/org-get.ts`.
 */
export function stripOrgSecrets<T>(org: T): T {
  if (!org || typeof org !== "object" || Array.isArray(org)) return org;
  const out: Record<string, unknown> = { ...(org as Record<string, unknown>) };
  delete out.identityTokens;
  const qualificationFlow = out.qualificationFlow;
  if (
    qualificationFlow && typeof qualificationFlow === "object" && !Array.isArray(qualificationFlow)
  ) {
    const copy: Record<string, unknown> = { ...(qualificationFlow as Record<string, unknown>) };
    delete copy.sessionCookie;
    out.qualificationFlow = copy;
  }
  return out as T;
}
