/**
 * Is WebinarGeek up? — declared absent, not faked.
 *
 * `status.webinargeek.com` is NOT a status page: it is a CNAME onto WebinarGeek's own
 * application. Verified live 2026-09-06 — it 302s to `https://status.webinargeek.com/users/sign_in`,
 * sets the identical `webinargeek` session cookie the main app sets, and its `/api/v2/*` paths
 * answer the SAME `{"code":"unauthorized","message":"Key is not provided or does not exists"}`
 * body this app's own API returns for a missing `Api-Token` — i.e. it is the product API itself,
 * reachable at a second hostname, not a separately-operated status surface.
 *
 * The two conventional decoys were checked too and both fail: `webinargeek.statuspage.io` 302s
 * to Statuspage's own marketing page (the unclaimed-page pattern seen elsewhere in this pack),
 * and `webinargeek.instatus.com` answers Instatus's own generic landing page rather than a
 * claimed status page for this vendor. No RSS/Atom feed is linked from WebinarGeek's site or
 * help center either. WebinarGeek publishes no public, machine-readable status surface of any
 * kind.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md "Declaring absence" —
 * better than a silent gap or a `check` that always returns `unknown`. `severity: "informational"`
 * so this entry never pins the App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "WebinarGeek platform status",
  description:
    "No machine-readable status surface: status.webinargeek.com is the product app itself " +
    "(same session cookie, same API error body), not a status page, and no Statuspage/Instatus " +
    "page or RSS/Atom feed exists for this vendor.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.webinargeek.com is a CNAME onto the product app, not a status page; no Statuspage/" +
      "Instatus page or feed was found for WebinarGeek.",
  },
};

export default service;
