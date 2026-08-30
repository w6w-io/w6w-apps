/**
 * Is SharePoint Online up? — declared absent, with the reasoning recorded.
 *
 * This is the same conclusion the sibling Microsoft Graph Apps (`onedrive`,
 * `outlook`, `excel`, `teams`, `microsoft-todo`) already reached for the same
 * underlying service, re-probed against Microsoft's own surfaces on
 * **2026-08-11** rather than restated. None of them is a *documented,
 * unauthenticated, machine-readable* statement about SharePoint Online:
 *
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) is the right answer semantically, but it requires the
 *     `ServiceHealth.Read.All` permission with tenant-admin consent and is
 *     scoped to the calling tenant's own subscribed services. A check that
 *     most connections cannot run reports a working App as broken.
 *   - **`status.cloud.microsoft`** is a client-rendered page: the root answers
 *     `200 text/html` in 2,058 bytes, and so does an invented path under it
 *     (`/api/v1/status` returns the *same* 2,058-byte shell). A 200 there
 *     proves only that the SPA loaded. Its real backing JSON is undocumented,
 *     discoverable only by reading the page's script bundle, and
 *     `/api/v2/status.json` answers `401`.
 *   - **`status.office365.com/api/v2/status.json`** answers `301` to
 *     `status.cloud.microsoft`, i.e. back to the shell above.
 *   - **`portal.office.com/servicestatus`** and
 *     **`admin.microsoft.com/servicestatus`** both answer `302` (183 bytes)
 *     into that same page; neither is a status document.
 *   - The Service Health Dashboard's **RSS feed was retired**; the current
 *     guidance points humans at the status site and `@MSFT365Status`, neither
 *     of which is a machine surface.
 *
 * So this is declared absent rather than backed by a guess. `severity:
 * "informational"` because an `unavailable` entry always reports `unknown`,
 * and a non-informational check would pin this App's roll-up verdict there
 * permanently.
 *
 * Credential liveness is covered regardless: the runtime derives an
 * `auth:oauth2` check from the Auth `test` hook, which probes `GET /me`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "SharePoint Online platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for SharePoint Online — the same conclusion the sibling onedrive/outlook/excel/teams/microsoft-todo Apps reached for the same underlying service, re-probed 2026-08-11. The Graph service-health API (`/admin/serviceAnnouncement/healthOverviews`) needs `ServiceHealth.Read.All` with tenant-admin consent; `status.cloud.microsoft` is a client-rendered page that returns the same 2,058-byte HTML shell for an invented path as for its root, and its `/api/v2/status.json` returns 401; `status.office365.com/api/v2/status.json` returns a 301 to that page; `portal.office.com/servicestatus` and `admin.microsoft.com/servicestatus` both return 302 into it; and the Service Health Dashboard's RSS feed has been retired. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
