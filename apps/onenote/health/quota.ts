/**
 * How much API headroom is left? — declared absent, and more conclusively so
 * than the sibling Graph Apps: OneNote's own service-limits page states its
 * ceilings are fixed and, unlike SharePoint's or Outlook's, offers **no
 * `Retry-After` header even when you are actually throttled**.
 *
 * Microsoft's Graph throttling reference lists OneNote's limits explicitly,
 * separate from every other workload:
 * https://learn.microsoft.com/en-us/graph/throttling-limits
 *
 *     OneNote service limits
 *     Requests rate:        120 requests per 1 minute, 400 per 1 hour  (delegated, per app per user)
 *                            240 requests per 1 minute, 800 per 1 hour (application context)
 *     Concurrent requests:  5  (delegated) / 20 (application context)
 *
 *     Note: The resources listed [notebook, onenote, onenoteOperation,
 *     onenotePage, onenoteResource, onenoteSection, sectionGroup] don't
 *     return a Retry-After header on 429 Too Many Requests responses.
 *
 * Further detail: https://developer.microsoft.com/en-us/office/blogs/onenote-api-throttling-and-how-to-avoid-it/
 *
 * That absence of `Retry-After` is the operative fact for this check: every
 * sibling Graph App that declares its quota absent (`outlook`, the
 * `request-rate` half of `sharepoint`) still gets a `Retry-After` hint on the
 * one signal that does fire (`429`). OneNote does not even offer that — there
 * is no proactive header on success, and no reactive hint on failure either.
 * A poll-based check would have nothing to read in either state, so none is
 * offered; a `429` still surfaces to a caller as an ordinary Graph error via
 * `describeFailure()` in `lib/client.ts`.
 *
 * `severity: "informational"` for the same reason as the `service` check: a
 * declared absence always reports `unknown`, and must not pin the verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft Graph's throttling reference lists fixed OneNote ceilings — 120 requests per minute and 400 per hour per app per user (delegated context) — but publishes no proactive headroom endpoint or rate-limit header for them, and states explicitly that the OneNote resources (notebook, onenote, onenoteOperation, onenotePage, onenoteResource, onenoteSection, sectionGroup) 'don't return a Retry-After header on 429 Too Many Requests responses' either. That leaves nothing to poll from a cold start and no reactive hint to surface once throttled, unlike the sibling sharepoint/outlook Apps' declared-absent quota checks, which at least get a Retry-After on a 429. A 429 still reaches a caller as an ordinary Graph API error.",
  },
};

export default quota;
