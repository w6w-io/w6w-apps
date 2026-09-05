import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Sender publishes no confirmed quota-headroom signal, so this declares
 * `unavailable` rather than guessing.
 *
 * `api.sender.net/errors/` documents `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 * `X-RateLimit-Reset` and `Retry-After` — but only in the context of its
 * "429 - Too many requests" section. The page never states whether those
 * headers also ride along on ordinary 2xx responses (where a `remaining`
 * count would actually be useful as headroom) or whether they appear only on
 * the 429 refusal itself, after the limit is already hit. Verifying that
 * distinction needs a live account and a live token, which this pass does not
 * have. Per the hard rule against inferring undocumented behaviour, this is
 * left undeclared rather than shipping a check that might always read
 * `unknown` while implying otherwise, or worse, a fabricated one that reports
 * `ok` from headers that were never actually confirmed to exist on a success
 * response.
 *
 * `severity: "informational"` — required for a declared-unavailable check, or
 * its permanent `unknown` pins this App's roll-up there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "api.sender.net/errors/ documents X-RateLimit-Limit/-Remaining/-Reset and Retry-After only " +
      'under its 429 ("too many requests") section, and does not state whether they are also ' +
      "sent on ordinary 2xx responses. Confirming that needs a live account and token, which " +
      "this pass did not have, so this is declared unavailable rather than assumed either way.",
  },
};

export default quota;
