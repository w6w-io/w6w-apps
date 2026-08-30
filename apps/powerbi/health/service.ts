/**
 * Is Power BI up? — declared absent, with the reasoning recorded.
 *
 * Verified live 2026-08-30. This is genuinely a different investigation from
 * the sibling Microsoft apps' (`sharepoint`, `teams`) — Power BI's REST API
 * is not Microsoft Graph, so its status story does not automatically inherit
 * theirs — but it lands on the same conclusion for different reasons, and one
 * of those reasons is exactly the "two components, one page" trap this pack
 * hit before with Google's Gemini Developer API vs. Vertex AI (`gemini`
 * App's `service.ts`):
 *
 *   - **`status.cloud.microsoft`** (the Microsoft 365 admin-center-style
 *     dashboard SharePoint/Teams already ruled out) is a client-rendered
 *     page: its root and an invented path both answer `200 text/html` with
 *     the identical 2,058-byte shell, and `/api/v2/status.json` answers
 *     `401`. Re-verified for Power BI specifically rather than assumed.
 *   - **The Microsoft 365 admin service-health API**
 *     (`/admin/serviceAnnouncement/healthOverviews`) does carry Power BI as a
 *     tracked service — but it needs the `ServiceHealth.Read.All` permission
 *     with tenant-admin consent, a different trust level from the four
 *     workspace-scoped delegated scopes this App's OAuth already requests.
 *   - **`azure.status.microsoft`** is a genuinely different, real surface —
 *     and it names **two separate rows**: "Power BI" and "Power BI
 *     Embedded". Both are server-rendered (not a client SPA — the HTML table
 *     itself carries each row's live status icon), so on the surface this
 *     looks like the machine-readable answer the SharePoint/Teams
 *     investigation never found. It publishes a real incident RSS feed
 *     (linked from the page itself, not guessed:
 *     `https://rssfeed.azure.status.microsoft/en-us/status/feed/`), and a
 *     historical item confirmed live (23 Jul 2026, "Issues connecting to
 *     resources in West US") carries a `<category>` list naming the specific
 *     affected services — "Power BI Embedded" was one of them that day,
 *     "Power BI" was not.
 *
 *     That per-incident service tagging is exactly the signal a check would
 *     need — and exactly what this pack's `feed`-backed check mechanism does
 *     NOT expose to a `check()` hook: `HealthFeedEntry` (core's
 *     `packages/types/src/health.ts`) surfaces only `title` / `summary` /
 *     `summaryHtml` / `link` / `publishedAt`, never the RSS `<category>`
 *     elements the affected-service list actually lives in. The confirmed
 *     live item's own title ("Issues connecting to resources in West US")
 *     and body never mention "Power BI" by name at all, even though its
 *     categories did. A check built to substring-match the title/summary for
 *     "Power BI" would not have caught that incident — a worse failure mode
 *     than declaring the surface absent, because it reports false confidence
 *     instead of an honest `unknown`. And even if the categories were
 *     surfaced, "Power BI" and "Power BI Embedded" are the two
 *     easily-conflated, separately-tracked components this file's own title
 *     warns about: an Embedded-capacity outage is not necessarily a
 *     `api.powerbi.com` outage for a non-Embedded caller, and vice versa.
 *
 * So this is declared absent rather than parsed from a feed proven to hide
 * the one signal it would need. `severity: "informational"` because an
 * `unavailable` entry always reports `unknown`, and a non-informational
 * check would pin this App's roll-up verdict there permanently.
 *
 * Credential liveness is covered regardless: the runtime derives an
 * `auth:oauth2` check from the Auth `test` hook, which probes
 * `GET /availableFeatures`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Power BI platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, per-service machine-readable status surface for Power BI that this App can safely parse. status.cloud.microsoft is a client-rendered page returning the identical 2,058-byte HTML shell for its root and an invented path, and its /api/v2/status.json returns 401 (re-verified 2026-08-30). The Microsoft 365 admin service-health API tracks Power BI but needs ServiceHealth.Read.All with tenant-admin consent, a different trust level from this App's workspace-scoped OAuth. azure.status.microsoft names two separate, easily-conflated components — 'Power BI' and 'Power BI Embedded' — and its incident RSS feed tags affected services via RSS <category> elements that this pack's feed-parsing mechanism does not surface to a health check hook (only title/summary/link/date); a live-confirmed incident (23 Jul 2026, West US connectivity) named 'Power BI Embedded' in its categories while never mentioning either service by name in its title or body, so a title/summary-based filter would have missed it silently. Outages surface to this App as non-2xx responses from api.powerbi.com.",
  },
};

export default service;
