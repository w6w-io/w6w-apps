import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  opportunityName: string;
  opportunityDetails?: string;
  opportunityState?: string;
  organisationId?: number;
  responsibleUserId?: number;
  bidAmount?: number;
  bidCurrency?: string;
  probability?: number;
  forecastCloseDate?: string;
}

/**
 * `opportunityState` is a free-text field on the wire (`OPPORTUNITY_STATE`,
 * `maxLength: 20` in Insightly's own schema) — the v3.1 API docs do not
 * publish a fixed enum for it, so this stays a plain string rather than a
 * `select` with invented options. Insightly's UI is widely known to use
 * OPEN/WON/LOST/ABANDONED, but that isn't stated in the API's own reference,
 * so it isn't asserted here.
 */
const opportunityCreate: ActionDefinition<Input> = {
  key: "opportunity-create",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create an opportunity.",
  idempotent: false,
  params: [
    { key: "opportunityName", label: "Name", type: "string", required: true },
    { key: "opportunityDetails", label: "Details", type: "text" },
    {
      key: "opportunityState",
      label: "State",
      type: "string",
      hint: "Free text — Insightly does not publish a fixed list for this field via the API.",
      advanced: true,
    },
    { key: "organisationId", label: "Organisation ID", type: "number" },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number", advanced: true },
    { key: "bidAmount", label: "Bid amount", type: "number", row: "bid" },
    { key: "bidCurrency", label: "Bid currency", type: "string", row: "bid" },
    { key: "probability", label: "Probability (%)", type: "number", advanced: true },
    { key: "forecastCloseDate", label: "Forecast close date", type: "datetime", advanced: true },
  ],
  output: [
    { key: "OPPORTUNITY_ID", type: "number", label: "Opportunity ID" },
    { key: "OPPORTUNITY_NAME", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request("/Opportunities", {
      method: "POST",
      body: compact({
        OPPORTUNITY_NAME: input.opportunityName,
        OPPORTUNITY_DETAILS: unset(input.opportunityDetails),
        OPPORTUNITY_STATE: unset(input.opportunityState),
        ORGANISATION_ID: input.organisationId,
        RESPONSIBLE_USER_ID: input.responsibleUserId,
        BID_AMOUNT: input.bidAmount,
        BID_CURRENCY: unset(input.bidCurrency),
        PROBABILITY: input.probability,
        FORECAST_CLOSE_DATE: unset(input.forecastCloseDate),
      }),
    });
  },
};

export default opportunityCreate;
