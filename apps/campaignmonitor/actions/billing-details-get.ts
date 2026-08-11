import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/billingdetails.json` — the account's email-credit balance.
 * **Account-level.**
 *
 * The whole documented response is `{"Credits": 3021}`.
 *
 * Two things to know before wiring this into a decision:
 *
 *  - It is agency-facing. A direct (non-agency) customer is answered
 *    `403 {"Code":403,"Message":"Not allowed for a Non-agency Customer."}`,
 *    which this app surfaces verbatim rather than flattening to "forbidden".
 *  - Credits are a **balance, not a ceiling**, and they are irrelevant on a
 *    monthly-billed plan, where zero is the normal state of a perfectly healthy
 *    account. That is why the App declares no `quota` health check off this
 *    number — see `health/quota.ts`.
 */
interface BillingDetails {
  Credits?: number;
}

const billingDetailsGet: ActionDefinition<Record<string, never>, BillingDetails> = {
  key: "billing-details-get",
  type: "read",
  resource: "account",
  title: "Get Billing Details",
  description:
    "Read the account's email-credit balance. Agency accounts only; a direct customer gets a 403 " +
    "with code 403. Credits are a balance with no ceiling and are unused on monthly plans.",
  params: [],
  output: [{ key: "Credits", type: "number", label: "Email credits in the account" }],

  execute(_input, ctx) {
    return new CampaignMonitorClient(ctx).json<BillingDetails>("/billingdetails");
  },
};

export default billingDetailsGet;
