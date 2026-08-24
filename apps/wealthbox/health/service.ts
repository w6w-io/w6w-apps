/**
 * Is Wealthbox up? — declared absent, not faked.
 *
 * `status.wealthbox.com` DOES resolve, and does answer 200 for a status.io
 * page mirror at `/1.0/status/5c5df1d4f1fdd844f29883d6` (the classic
 * `api.status.io/1.0/status/{pageId}` shape, served instead from Wealthbox's
 * own custom status domain). But the payload it returns is a DECOY, not a
 * live signal — checked 2026-08-24, its `result.status_overall.updated` and
 * every component's `updated` timestamp read `2019-02-08T21:17:08...`, over
 * seven years stale, and every component reads "Operational" (`status_code:
 * 100`). A feed that has not moved in seven years and never reports anything
 * but "Operational" carries zero information — it cannot distinguish a real
 * outage from the monitor having been abandoned, which is exactly the trap
 * this pack's own fake-status-page lesson warns about (an HTTP 200 with a
 * JSON-shaped body is not proof of a live signal). The plain `/api/v2/*`
 * Statuspage.io paths on the same host also 404 (checked the same day), and
 * `wealthbox.statuspage.io` answers "Your page is inactive" — so there is no
 * DIFFERENT machine-readable surface to fall back to either.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence" — better than polling a feed that would always read
 * `ok` regardless of what is actually happening. `severity: "informational"`
 * so this entry never pins the App's roll-up verdict at `unknown` forever;
 * the derived `auth:api-key` check (from `auth/api-key.ts`'s `test` hook)
 * is what actually answers "is this working" day to day.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wealthbox platform status",
  description:
    "No live status surface: status.wealthbox.com's status.io-shaped JSON endpoint is frozen at " +
    '2019 data (always "Operational"), and its Statuspage.io paths 404 / report the page inactive.',
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.wealthbox.com's /1.0/status/{id} JSON answers 200 but has not updated since " +
      "2019-02-08 and always reads Operational — a frozen decoy, not a live signal. Its " +
      "Statuspage.io paths 404, and wealthbox.statuspage.io reports its page inactive.",
  },
};

export default service;
