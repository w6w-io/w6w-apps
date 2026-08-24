import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Browse AI publishes no readable quota or rate-limit headroom, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## Verified two ways on 2026-08-24
 *
 * 1. **Nothing on the wire.** Live responses from `api.browse.ai` — both 401s
 *    and the OpenAPI document's own header lists — carry no
 *    `X-RateLimit-*`/`RateLimit-*` header of any kind.
 * 2. **Nothing in the documentation.** The OpenAPI document names exactly one
 *    metered thing: task-run **credits**, surfaced only as a
 *    `403 credits_limit_reached` refusal on `task-run`/`bulk-run-create` at
 *    the moment the team runs out. There is no `/usage` or `/credits`
 *    endpoint to read a balance from in advance, and `Team` (from the
 *    internal, Auth0-only `/v2/teams` endpoint this app does not call) carries
 *    only `{id, name, api, createdAt}` — no credit or usage figures anywhere.
 *
 * The only forward-looking signal this API offers is `Monitor.pausedReason ===
 * "lowCredits"` on an existing monitor — a monitor that has already paused
 * itself, which `monitor-get`/`monitor-list` already surface. That is a
 * per-monitor symptom, not an account-wide balance a standing check could
 * read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Task-run credit headroom",
  kind: "quota",
  covers: ["action:task-run", "action:bulk-run-create"],
  severity: "informational",
  unavailable: {
    reason: "Browse AI exposes no balance or rate-limit endpoint: live API responses carry no " +
      "X-RateLimit-*/RateLimit-* header, and the OpenAPI document's only metered signal is a " +
      "403 credits_limit_reached refusal from task-run/bulk-run-create, delivered at the moment " +
      "credits run out rather than as headroom read in advance. The closest forward-looking " +
      'signal — a monitor\'s pausedReason of "lowCredits" — is a per-monitor symptom surfaced by ' +
      "monitor-get/monitor-list, not an account balance a standing check could read.",
  },
};

export default quota;
