import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How many of this account's 500 free monthly pushes are left? — declared
 * `unavailable`, because Pushbullet documents the ceiling but exposes no way
 * to read current consumption against it.
 *
 * The vendor's own docs (`docs.pushbullet.com`, Limits section, fetched
 * 2026-08-29): "Free accounts (without a Pro subscription) are limited to 500
 * pushes per month. Going over will result in an error when sending a Push."
 * No endpoint, response field or header reports pushes sent this cycle, the
 * plan tier, or the reset date — unlike the *request-rate* ceiling, which IS
 * readable from `X-Ratelimit-*` on every response and is reported by the
 * `rate-limit` check instead. The two are genuinely different limits (API call
 * volume vs. billable pushes sent), so collapsing this into `rate-limit` would
 * imply a fact about push quota that no response ever states.
 *
 * `informational`: an `unavailable` entry always reports `unknown`, which
 * outranks `ok` in the roll-up, so any other severity would pin the App's
 * verdict at `unknown` forever.
 */
const pushLimit: HealthCheckDefinition = {
  key: "push-limit",
  title: "Monthly push allowance",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: 'Pushbullet documents a 500-push/month ceiling for free accounts ("Going over will ' +
      'result in an error when sending a Push") but exposes no endpoint, field or header that ' +
      "reports pushes sent this cycle, the account's plan tier, or when the cycle resets. This " +
      "is a distinct limit from the API request-rate ceiling, which the `rate-limit` check " +
      "reports because X-Ratelimit-* headers actually carry it.",
  },
};

export default pushLimit;
