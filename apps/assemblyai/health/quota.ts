import type { HealthCheckDefinition } from "@w6w/types";

/**
 * AssemblyAI publishes no API-readable quota of any kind, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity a
 * declared absence would pin the app's verdict at `unknown` forever.
 *
 * ## Two things AssemblyAI meters, NEITHER readable via the API
 *
 * Verified against AssemblyAI's own docs on 2026-08-29 — two axes, both dashboard-only:
 *
 *  1. **Prepaid balance / spend.** "Monitor your balance on the Billing page (under
 *     Workspace > Settings > Billing in the dashboard)" — there is no `GET` endpoint for
 *     it anywhere in the OpenAPI document (`www.assemblyai.com/docs/openapi.json`).
 *     Unlike CloudConvert's `GET /v2/users/me` (`credits` field, covered by that app's own
 *     `quota` check), AssemblyAI has no equivalent call. This matters more than it might
 *     for other vendors: AssemblyAI's own error-handling reference lists "insufficient
 *     balance" as one of THREE possible causes of a `401` (see `auth/api-token.ts`), so a
 *     failing credential check may really be an empty balance — this app just cannot read
 *     the number in advance to say so with certainty.
 *  2. **Parallel-transcription rate limit headroom.** "The Rate Limits page shows the
 *     request limits in effect for your account" (dashboard only) — reading it via the API
 *     would mean submitting a transcription and inspecting whether it landed in `queued`
 *     (rate-limited) vs `processing` (not), which is a side effect (a real, billed job),
 *     not a free probe. No `X-RateLimit-*` response header appears on any endpoint in the
 *     OpenAPI document either.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account balance / rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "AssemblyAI exposes neither prepaid balance nor parallel-transcription rate-limit " +
      "headroom through its API — both are dashboard-only (Workspace > Settings > Billing, and " +
      "the Rate Limits page respectively). There is no GET /v2/... endpoint for either in " +
      "AssemblyAI's own OpenAPI document (www.assemblyai.com/docs/openapi.json, checked " +
      "2026-08-29), and no X-RateLimit-* response header on any documented path. Reading " +
      "rate-limit headroom would require submitting a real, billed transcription and " +
      "inspecting whether it queued — not a side-effect-free probe.",
  },
};

export default quota;
