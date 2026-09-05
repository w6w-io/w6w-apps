/**
 * Is Kommo up? — declared absent, on purpose.
 *
 * `status.kommo.com` is real: verified 2026-09-05 by reading the page itself
 * (`og:site_name` "Kommo Status", a live "CRM" / "Digital Pipeline" / "Facebook
 * Integration" / "Instagram Integration" / "WhatsApp Business Integration"
 * component list, and a genuine incident history with real timestamps — not a
 * decoy). It is a custom-built page, not Statuspage/Better Stack/Instatus/
 * status.io, and it publishes **no machine-readable feed of any kind**: every
 * path other than `/` answered 403 (nginx), including every shape this pack
 * checks elsewhere before giving up — `/api/v2/summary.json`, `/api/v2/status.json`,
 * `/api/v1/summary.json`, `/index.json`, `/history.atom`, `/history.rss`,
 * `/feed`, `/rss` — and the page's own HTML carries no `<script src>` bundle
 * or embedded API endpoint to reverse-engineer either.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — a
 * real status page existing but publishing nothing machine-readable is not
 * the same failure as an App being broken.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Kommo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.kommo.com is a real, actively-updated status page (verified 2026-09-05: a live " +
      "component list and incident history) but publishes no machine-readable feed — every path " +
      "checked other than the page itself (Statuspage-, Better-Stack-, Instatus- and status.io-" +
      "shaped JSON, plus /index.json, /history.atom, /history.rss, /feed and /rss) answered 403, " +
      "and the page's HTML embeds no API endpoint to read instead. The `account` check below " +
      "covers this connection's own reachability.",
  },
};

export default service;
