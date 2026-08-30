/**
 * Do we have quota left? — declared absent.
 *
 * Verified live 2026-08-30: neither an unauthenticated request nor a
 * syntactically-bogus bearer token to `api.powerbi.com` returns any
 * `x-ratelimit-*` / `retry-after` header — a rejected request comes back
 * `403` with `content-length: 0` (see `../lib/client.ts`'s doc comment) and
 * no rate-limit headers of any kind. The REST API reference's own
 * "Throttling" section confirms the model is purely reactive: "Power BI
 * limits the number of API calls within a time window per user," and a
 * throttled call answers `429` with a `Retry-After` header — there is
 * nothing to poll from a cold start.
 *
 * Two documented, non-quantified ceilings are recorded in `reason` because
 * they are the limits most likely to bite a workflow, even though no probe
 * can measure headroom against either of them:
 *
 *   - **Dataset refreshes on a Shared-capacity workspace**: at most 8
 *     requests/day (scheduled refreshes count against the same budget).
 *   - **DAX query execution**: 120 requests/minute per user, across every
 *     dataset — not per-dataset.
 *
 * A per-workspace storage/capacity quota does exist in Power BI (Premium
 * capacity headroom), but reading it needs `Get Refreshables For Capacity` /
 * capacity-admin scopes this App's four workspace-level OAuth scopes do not
 * request — the same "narrowest usable credential" reasoning this pack
 * applies everywhere else: a check that needs a scope most connections
 * legitimately lack would report a working App as broken.
 *
 * `severity: "informational"` for the same reason as `service.ts`: a
 * declared absence always reports `unknown`, and must not pin the verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Power BI publishes no headroom endpoint and no rate-limit headers on any response — verified live 2026-08-30 against both an unauthenticated request and a bogus bearer token. Throttling is reactive: a 429 with a Retry-After header, per the REST API reference's own Throttling section. Two documented, non-quantified ceilings a workflow can still hit: at most 8 dataset-refresh requests/day on a Shared-capacity workspace (scheduled refreshes count against the same budget), and 120 DAX query-execution requests/minute per user across every dataset. A Premium-capacity storage/refreshable quota does exist, but reading it needs capacity-admin scopes this App's workspace-level OAuth does not request.",
  },
};

export default quota;
