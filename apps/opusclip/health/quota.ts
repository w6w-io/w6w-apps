import type { HealthCheckDefinition } from "@w6w/types";

/**
 * OpusClip publishes no readable, pre-emptive quota-headroom endpoint, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever.
 *
 * ## What IS metered, and why it still can't be read in advance
 *
 * Per `help.opus.pro/api-reference/limitation`, the Pro Beta and Max plans
 * include 900 credits (15 hours) of API usage per calendar month per
 * workspace, and a project has a 10-credit minimum. But there is no
 * documented `GET` for "credits remaining": the cap is enforced entirely by
 * REFUSAL — once a workspace has used its 900 credits, `POST
 * /api/clip-projects` (and other credit-consuming calls) answers `403` with
 * `{"code": "API_MONTHLY_CAP_REACHED", "reset_at": "...", "upgrade_url":
 * "..."}`, deliberately `403` rather than `429` so agent/retry frameworks
 * don't loop. Concurrency (4 projects for Pro Beta/Max, 50 for Business) is
 * the same story: `429` with an `X-Cap-Reason: concurrent` header, discovered
 * only by hitting it. Neither ceiling has a corresponding read endpoint in the
 * OpenAPI document — a check here would have to spend a real project or a
 * real post to find out, which a health probe must not do.
 *
 * (The OpusClip MCP server exposes an `opusclip_get_usage` tool that reads
 * this, per `help.opus.pro/api-reference/agent-setup` — but that is the MCP
 * surface, not a documented REST endpoint this app's Actions can call.)
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly API credit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "OpusClip enforces its monthly cap (900 credits / 15h per workspace on Pro Beta and Max) " +
      "and its concurrency limit (4 or 50 simultaneous projects) purely by refusal — 403 " +
      "API_MONTHLY_CAP_REACHED and 429 with X-Cap-Reason: concurrent, respectively — and " +
      "publishes no GET endpoint that reads remaining headroom in advance. A health check would " +
      "have to spend a real project or post to find out, which it must not do.",
  },
};

export default quota;
