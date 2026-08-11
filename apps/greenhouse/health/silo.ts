/**
 * Which Greenhouse silo is *this* organisation on? Greenhouse does not say.
 *
 * A declared absence rather than a gap, because the question is a natural one to
 * ask and the answer is genuinely not available.
 *
 * ## Why anyone would want this
 *
 * `status.greenhouse.io` does not report "the Harvest API" as one component. It
 * reports **eleven** — Silo 1 through Silo 9, plus Silo 101 and Silo 201 — inside
 * the `Greenhouse Harvest API` group, because Greenhouse shards its customers
 * across independent stacks and an incident usually hits one of them. So the
 * useful version of "is Greenhouse up?" is "is *my* silo up?", and
 * `health/service.ts` cannot ask it: with no way to know which silo a connection
 * belongs to, it has to roll up all eleven, which means one silo's outage shows
 * as a degraded verdict for every tenant and a tenant on the broken silo sees the
 * same amber as everyone else.
 *
 * ## Why it cannot be answered
 *
 * No Harvest v3 endpoint returns the organisation's silo. There is no
 * organisation resource at all in the 134-path OpenAPI document, and none of the
 * 118 status-page components carries a customer identifier.
 *
 * The one place the number does appear is inside the access token. Greenhouse's
 * own published example JWT decodes to a payload containing `"silo": 4` beside
 * `act.organization.name`. That is not a route to an answer here, for two
 * independent reasons, and both matter:
 *
 *  1. **It would mean parsing a credential.** The token is the credential. The
 *     only hook permitted to see one is `sign`, which is network-less by design
 *     precisely so that the code holding a credential cannot act on it. Decoding
 *     a token elsewhere to steer a health probe inverts that.
 *  2. **The mapping is undocumented.** The `silo` claim appears in an example,
 *     not in any specification of the token's claims, and nothing published
 *     states that `silo: 4` corresponds to the status page's component named
 *     "Silo 4". It is an extremely plausible inference. It is still an inference,
 *     and a health verdict built on one reports confident nonsense the first time
 *     it is wrong.
 *
 * Both are ordinary engineering caution. Stated as an absence rather than
 * silently omitted, so the next person to notice the eleven silos knows the
 * question was asked and why it has no answer yet.
 *
 * ## `severity: "informational"` is required, not stylistic
 *
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * a roll-up. At any other severity, saying "Greenhouse does not publish this"
 * would pin the app's verdict at `unknown` permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const silo: HealthCheckDefinition = {
  key: "silo",
  title: "This organisation's Harvest silo",
  description:
    "Greenhouse's status page reports the Harvest API as eleven independent silos, but publishes " +
    "no way to learn which one an organisation runs on — so the platform check has to roll all " +
    "eleven together rather than report yours.",
  kind: "dependency",
  scope: "connection",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No Harvest v3 endpoint exposes the organisation's silo, and the 134-path OpenAPI " +
      "document has no organisation resource at all. The number does appear as a `silo` claim " +
      "inside the access token in Greenhouse's own example JWT, but reading it would mean " +
      "parsing a credential outside the `sign` hook, and nothing published states that the " +
      "claim's value maps to the status page's `Silo N` component names. Both would have to " +
      "change for this check to become real.",
  },
};

export default silo;
