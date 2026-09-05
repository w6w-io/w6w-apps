/**
 * Is ERPNext up? — the question does not apply, and saying so is the point.
 *
 * ERPNext is **self-hosted software, not a service**. There is no vendor
 * running the site this connection points at, so there is nothing a vendor
 * status page could tell you about it. `instance` is the check that answers
 * the real question, by asking the site itself.
 *
 * Every plausible status surface for ERPNext/Frappe was checked live
 * (2026-09-05) and none of them names a real, operated platform:
 *
 *   - `status.erpnext.com` answers `404 "status.erpnext.com does not exist"`
 *     and its TLS certificate expired 2023-05-05 — long-abandoned.
 *   - `status.frappe.io` and `status.frappecloud.com` do not serve a status
 *     page at all: the former resolves into the Frappe Cloud dashboard
 *     single-page app itself (a login screen), the latter answers "Your page
 *     is inactive."
 *   - `frappe.statuspage.io` answers `401 "Your page is inactive. Please
 *     include an API key to access this resource."` — an inactive Statuspage
 *     instance.
 *   - `erpnext.statuspage.io` DOES resolve, but its only component is named
 *     literally `"API (example)"` — Statuspage's unconfigured default
 *     template, the same signature this pack treats as a decoy everywhere
 *     else it appears (see `hedy`, `mautic`).
 *
 * Frappe Cloud is one hosting option for ERPNext among many self-hosting
 * choices, not a fixed platform every Connection points at — so even a real
 * Frappe Cloud status page would not answer for a self-managed install.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app whose vendor has nothing to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "ERPNext platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "ERPNext/Frappe is self-hosted software, so there is no vendor platform behind a " +
      "connection — the `instance` check asks this connection's own site instead. Checked live " +
      "2026-09-05: status.erpnext.com 404s and its TLS cert expired in 2023; status.frappe.io " +
      "and status.frappecloud.com serve no status page (the former is the Frappe Cloud " +
      "dashboard app, the latter 'Your page is inactive'); frappe.statuspage.io is inactive; " +
      "erpnext.statuspage.io resolves but its only component is the unclaimed Statuspage " +
      "default, literally named 'API (example)'. Frappe Cloud is also only one of several " +
      "self-hosting options, so even a real status page there would not describe most " +
      "installs' own sites.",
  },
};

export default service;
