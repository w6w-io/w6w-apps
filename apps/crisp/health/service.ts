/**
 * Is Crisp up? — Crisp runs its own status page on **Vigil**, an open-source
 * status engine Crisp itself publishes (github.com/crisp-oss/vigil), NOT
 * Atlassian Statuspage. This matters for anyone porting a "check
 * `/api/v2/summary.json`" habit from another vendor in this pack: that path
 * does not exist here.
 *
 * ## How this was found and verified — not guessed
 *
 * `docs.crisp.chat` itself renders a tiny live status pill in its footer
 * ("All systems are healthy" / "Service slowdown ongoing" / ...). Its bundled
 * `common.js` declares the widget's data source as
 * `{ provider: "vigil", target: "https://status.crisp.chat" }` and a
 * `__fetch_status_health` switch whose `"vigil"` case does:
 *
 *     fetch(target + "/status/text/", { mode: "cors" })
 *       .then(res => res.status !== 200 ? Promise.reject(null) : res.text())
 *
 * Confirmed on the wire 2026-09-01:
 *
 *     $ curl -sSI https://status.crisp.chat/status/text/
 *     HTTP/2 200
 *     content-type: text/plain; charset=utf-8
 *     $ curl -sS https://status.crisp.chat/status/text/
 *     healthy
 *
 * And ruled out as a catch-all the same way this pack checks every status
 * host: a bogus sibling path 404s with 0 bytes rather than echoing the same
 * response, so the host genuinely routes rather than serving one page for
 * everything:
 *
 *     $ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
 *         https://status.crisp.chat/status/text/nonexistent-bogus-path-xyz
 *     404 0
 *
 * No JSON/component-level variant was found (`/status/json/`, `/badge/`,
 * Statuspage-shaped `/api/v2/*` paths all 404), so this check reports only
 * the page-level indicator Vigil's plain-text route gives — no per-component
 * detail is available to attribute.
 *
 * ## Annotation
 *
 *   - `kind: "service"`, `scope: "app"` (default) — one answer shared by every
 *     Connection.
 *   - `credential: "none"` (default) — unauthenticated; reports before anyone
 *     has connected.
 *   - `network.allow` — `status.crisp.chat` is deliberately NOT on the app's
 *     main egress allowlist; no Action has business calling it. Widened here,
 *     for this unsigned probe only.
 *   - `severity` defaults to `degraded`, so a vendor incident never hard-fails
 *     a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.crisp.chat";

/** Vigil's three-value health vocabulary (github.com/crisp-oss/vigil README). */
const HEALTH: Record<string, HealthState> = {
  healthy: "ok",
  sick: "degraded",
  dead: "down",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Crisp platform status",
  description: "Crisp's own Vigil status page (status.crisp.chat), page-level indicator only. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/status/text/`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const text = (await res.text()).trim().toLowerCase();
    const state = HEALTH[text];
    return state
      ? { state, ttlSeconds: 60 }
      : { state: "unknown", message: `unrecognized status page response: "${text}"` };
  },
};

export default service;
