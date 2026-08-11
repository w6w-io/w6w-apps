/**
 * How much API *rate* headroom is left? — declared absent, and this one changed
 * recently enough to be worth stating carefully.
 *
 * The sibling `excel` App reads the IETF `RateLimit-Limit` / `RateLimit-Remaining`
 * / `RateLimit-Reset` headers off `GET /me/drive` and treats their absence as
 * "below 80% of the one-minute limit". That was correct against the SharePoint
 * Online throttling guidance as written at the time. It is not correct now:
 * the same page (last updated **2026-08-10**) carries a section titled
 * "RateLimit headers" that says, in full —
 *
 *     "SharePoint Online does not return or support IETF RateLimit headers.
 *      Although these headers may be used by other services, applications
 *      should not depend on them for SharePoint Online and should instead
 *      honor the Retry-After header when throttling occurs."
 *
 * https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online
 *
 * (The page contradicts itself: its own best-practice summary and its "See also"
 * list still recommend the RateLimit headers. The dedicated section is the
 * specific, current statement, so it wins — and a check built on headers the
 * vendor says it does not send would silently report `ok` forever.)
 *
 * That leaves nothing to poll. Throttling here is purely reactive: `429 Too Many
 * Requests` — or `503 Server Too Busy` — with a `Retry-After` header, and no
 * proactive signal on a successful response. The published ceilings are recorded
 * in `reason` so an operator diagnosing a burst of 429s has the numbers to hand.
 *
 * `severity: "informational"` for the same reason as the `service` check: a
 * declared absence always reports `unknown`, and must not pin the verdict.
 *
 * Storage headroom is a different question with a real answer — see `quota.ts`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "SharePoint Online — the service that meters every OneDrive call, including those made through Microsoft Graph — publishes no request-rate headroom surface. Its throttling guidance (updated 2026-08-10) states that it 'does not return or support IETF RateLimit headers' and that applications should honor `Retry-After` instead, so there is nothing to poll from a cold start. Throttling is reactive: HTTP 429 or 503 with a `Retry-After` header. The documented per-app-per-tenant ceilings are resource-unit based — 1,250 RU/min and 1,200,000 RU/24h at 0-1,000 licenses, scaling to 6,250 RU/min and 6,000,000 RU/24h above 50,000 — where a single-item read costs 1 RU, a listing or a write costs 2, and any permission operation costs 5. Storage headroom is reported separately by the `quota` check.",
  },
};

export default requestRate;
