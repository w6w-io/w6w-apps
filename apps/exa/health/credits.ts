/**
 * Do we have prepaid credit/dollar balance left? — declared absent, not guessed.
 *
 * Exa is pay-as-you-go per request (e.g. $0.007-$0.015 per `/search` call,
 * $0.005 per `/answer` call per the OpenAPI spec's own worked examples), and
 * running out triggers the documented `NO_MORE_CREDITS` / `API_KEY_BUDGET_EXCEEDED`
 * / `TEAM_BUDGET_EXCEEDED` error tags on a 402. But no account/credits/balance
 * endpoint exists anywhere in the public OpenAPI spec (fetched 2026-09-01 from
 * `https://exa.ai/docs/exa-spec.json`, 42 paths, none of them billing/credits) —
 * the only place a dollar figure appears at all is each individual response's
 * own after-the-fact `costDollars`, not a queryable remaining balance. Team
 * dashboard pages (auto-recharge, invoices) are mentioned in the docs nav but
 * are dashboard-only, not part of the REST API this app calls.
 *
 * `severity: "informational"` per rfcs/healthcheck.md "Declaring absence" —
 * an `unavailable` entry always reports `unknown`, which would otherwise pin
 * the App's roll-up verdict there forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const credits: HealthCheckDefinition = {
  key: "credits",
  title: "Prepaid credit balance",
  description:
    "Not exposed: the Exa OpenAPI spec documents no account/credits/balance endpoint — only " +
    "each response's own after-the-fact costDollars.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No account/credits/balance endpoint exists in Exa's public OpenAPI spec (42 paths, none " +
      "billing-related). Running out surfaces only as a 402 with tag NO_MORE_CREDITS / " +
      "API_KEY_BUDGET_EXCEEDED / TEAM_BUDGET_EXCEEDED on the next billed call, not as a readable " +
      "balance beforehand.",
  },
};

export default credits;
