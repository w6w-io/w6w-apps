/**
 * Shippo's documented limit is a **per-minute burst ceiling that differs by
 * object type, HTTP verb, and test vs live token** — not a single quota with
 * headroom to report.
 *
 * ## What is documented
 *
 * Verified 2026-09-05 against `docs.goshippo.com/api-concepts/rate-limits`:
 * every object type (Address, Parcel, Shipment, Rate, Transaction, Customs
 * Item/Declaration, Refund, Manifest, Carrier Account, Batch, Tracking) has
 * its own POST/PUT/GET(single)/GET(multiple) ceilings, each split into a live
 * figure and a smaller test-mode figure — e.g. a live Shipment POST is capped
 * at 500/minute, a test Shipment POST at 50/minute. Exceeding any of them
 * answers `429`.
 *
 * ## Why there is nothing to poll
 *
 * No `X-RateLimit-*`/`Retry-After` response header was found on any live
 * probe (2026-09-05), and Shippo publishes no usage/headroom endpoint. With
 * eleven object types times four verb classes times two environments, there
 * is no single number a quota check could report even if a header existed —
 * "how much is left" is really eleven-times-four-times-two separate
 * questions, each resetting every 60 seconds. A check could therefore only
 * ever answer `unknown`, at the cost of a request against the very ceiling it
 * was watching.
 *
 * The consequence is surfaced where it is actionable instead: a `429` from
 * this app's own client (`lib/client.ts`) names the rate-limits doc and says
 * spacing calls out fixes it, rather than implying a quota that refills.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { RATE_LIMIT_DOC_URL } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Shippo's documented limits are PER-MINUTE ceilings that vary by object type, HTTP " +
      "verb, and test vs live token (verified 2026-09-05 at " + RATE_LIMIT_DOC_URL + ") — there " +
      "is no single 'headroom' figure across roughly eleven object types and four verb classes. " +
      "No X-RateLimit-*/Retry-After header was found on any live response, and Shippo publishes " +
      "no usage endpoint, so 'how much is left' is not a question any single call can answer. A " +
      "429 is surfaced on the call that hits it, naming the rate-limits doc, rather than implying " +
      "a quota that refills.",
  },
};

export default quota;
