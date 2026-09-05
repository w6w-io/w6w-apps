import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absence, not a gap. Checked live (2026-09-05) against every
 * Google-published incident feed this pack's other `google-*` apps use, and
 * none names Search Console:
 *
 * - `https://www.google.com/appsstatus/dashboard/products.json` — the Google
 *   Workspace Status Dashboard's own product list (37 entries: Gmail,
 *   Calendar, Docs, Drive, Chat, …). No "Search Console" or "Webmaster
 *   Tools" entry.
 * - `https://ads.google.com/status/publisher/products.json` — the dashboard
 *   this pack's `google-ads` and `google-analytics` apps use instead (16
 *   entries: Google Ads, the Ads API, Google Analytics, Campaign Manager
 *   360, Display & Video 360, …). No Search Console entry either.
 * - `https://status.cloud.google.com/incidents.json` — Google Cloud
 *   Platform infrastructure incidents. No entry's `affected_products`
 *   names Search Console.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown`
 * forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Search Console platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no machine-readable status feed that names Search Console. It appears " +
      "on neither the Google Workspace Status Dashboard nor the Google Ads/Analytics status " +
      "dashboard (used by this pack's other google-* apps for products outside Workspace), " +
      "and Google Cloud's incident feed covers infrastructure, not this product.",
  },
};

export default service;
