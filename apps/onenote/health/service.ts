/**
 * Is the OneNote service up? — declared absent, with the reasoning recorded.
 *
 * This is the same conclusion the sibling Microsoft Graph Apps (`onedrive`,
 * `outlook`, `excel`, `sharepoint`) already reached for the underlying
 * Microsoft 365 platform, re-probed against Microsoft's own surfaces on
 * **2026-09-05** rather than restated. None of them is a *documented,
 * unauthenticated, machine-readable* statement about OneNote specifically —
 * and OneNote itself sits on two DIFFERENT backends depending on the account
 * (consumer OneDrive for a personal Microsoft account, Exchange/SharePoint
 * infrastructure for a work-or-school one), so even a single vendor incident
 * feed could not speak for every connection this App serves:
 *
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) needs the `ServiceHealth.Read.All` permission with
 *     tenant-admin consent, is scoped to the calling tenant's own subscribed
 *     services, and is unsupported for personal Microsoft accounts outright —
 *     which every OneNote connection may be. A check most connections cannot
 *     run reports a working App as broken.
 *   - **`status.cloud.microsoft`** is a client-rendered page: the root answers
 *     `200 text/html` in 2,058 bytes, and so does an invented path under it.
 *     Its real backing JSON is undocumented and discoverable only by reading
 *     the page's script bundle; `/api/v2/status.json` answers `401`.
 *   - **`status.office365.com/api/v2/status.json`** answers `301` to
 *     `status.cloud.microsoft`, i.e. back to the shell above.
 *   - **`portal.office.com/servicestatus`** and
 *     **`admin.microsoft.com/servicestatus`** both answer `302` into that same
 *     page; neither is a status document, and both are Microsoft 365 (work or
 *     school) surfaces with no equivalent for a consumer account.
 *   - The Service Health Dashboard's **RSS feed was retired**; the current
 *     guidance points humans at the status site and `@MSFT365Status`, neither
 *     of which is a machine surface, and neither of which distinguishes
 *     OneNote from every other Microsoft 365 workload anyway.
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
  title: "OneNote / Microsoft 365 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for OneNote — the same conclusion the sibling onedrive/outlook/excel/sharepoint Apps reached for the underlying Microsoft 365 platform, re-probed 2026-09-05. OneNote itself has no single backend to watch: a personal Microsoft account's notebooks live on consumer OneDrive while a work-or-school account's live on Exchange/SharePoint infrastructure, so no one feed could speak for every connection anyway. The Graph service-health API (`/admin/serviceAnnouncement/healthOverviews`) needs `ServiceHealth.Read.All` with tenant-admin consent and is unsupported for personal accounts; `status.cloud.microsoft` is a client-rendered page that returns the same 2,058-byte HTML shell for an invented path as for its root, and its `/api/v2/status.json` returns 401; `status.office365.com/api/v2/status.json` returns a 301 to that page; `portal.office.com/servicestatus` and `admin.microsoft.com/servicestatus` both return 302 into it; and the Service Health Dashboard's RSS feed has been retired. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
