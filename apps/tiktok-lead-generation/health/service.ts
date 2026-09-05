import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TikTok for Business runs its own API status page at
 * `business-api.tiktok.com/portal/api-service-status` (confirmed live,
 * HTTP 200, real page — not a decoy). It is, like the rest of the docs
 * portal, a Next.js single-page app: its server-rendered payload carries only
 * device-detection flags (`isMobileDevice`, `isTabletDevice`), no status
 * data, and the actual incident/component state is fetched client-side from
 * an internal API this app could not locate or reach (checked: no
 * `/api/v2/*.json`-style Statuspage/Instatus path, no RSS/Atom feed, no
 * `_next/data` prerendered JSON — the page uses `getServerSideProps`, so
 * nothing is statically exported either).
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in a roll-up, so anything stricter
 * would pin this App's verdict at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "TikTok Business API status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "business-api.tiktok.com/portal/api-service-status is a real page but renders " +
      "entirely client-side from an internal, non-public API with no discoverable JSON/RSS/" +
      "Atom feed — checked live 2026-09-05.",
  },
};

export default service;
