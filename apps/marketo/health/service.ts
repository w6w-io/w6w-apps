/**
 * Is Marketo up? — no reachable, trustworthy answer exists to check for.
 *
 * Verified 2026-09-05:
 *   - `marketo.statuspage.io/api/v2/summary.json` answers `401` with the
 *     body `"Your page is inactive. Please include an API key to access
 *     this resource."` — the same "claimed but inaccessible" signature this
 *     pack already found for `deel` and `luma`'s Statuspage instances, not a
 *     working feed.
 *   - `status.marketo.com` and `trust.marketo.com` do not even complete a
 *     TLS handshake (curl: "TLS connect error … handshake failure" / could
 *     not resolve).
 *   - `www.marketo.com/trust/` redirects to `adobe.com/trust.html`, Adobe's
 *     generic corporate trust page — no Marketo-specific, let alone
 *     per-pod, status information.
 *
 * Even a working page would only describe Adobe/Marketo's shared
 * infrastructure, not any one customer's own pod — see `instance` for the
 * check that actually answers "is my instance up".
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Marketo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No reachable, trustworthy Marketo status feed exists. marketo.statuspage.io answers 401 " +
      "'Your page is inactive' (unclaimed/deactivated, verified 2026-09-05); status.marketo.com " +
      "and trust.marketo.com do not complete a TLS handshake; www.marketo.com/trust/ redirects " +
      "to Adobe's generic corporate trust page, with nothing Marketo-specific. Even a working " +
      "page would describe shared infrastructure, not any one customer's own pod — see the " +
      "`instance` check for that.",
  },
};

export default service;
