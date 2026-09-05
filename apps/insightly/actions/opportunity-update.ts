import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  opportunityId: number;
  opportunityName?: string;
  opportunityDetails?: string;
  opportunityState?: string;
  organisationId?: number;
  responsibleUserId?: number;
  bidAmount?: number;
  bidCurrency?: string;
  probability?: number;
  forecastCloseDate?: string;
  actualCloseDate?: string;
}

const opportunityUpdate: ActionDefinition<Input> = {
  key: "opportunity-update",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description: "Change an opportunity's fields. Only the ones you set are touched.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
    { key: "opportunityName", label: "Name", type: "string" },
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
    { key: "actualCloseDate", label: "Actual close date", type: "datetime", advanced: true },
  ],
  output: [
    { key: "OPPORTUNITY_ID", type: "number", label: "Opportunity ID" },
    { key: "OPPORTUNITY_NAME", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request("/Opportunities", {
      method: "PUT",
      body: compact({
        OPPORTUNITY_ID: input.opportunityId,
        OPPORTUNITY_NAME: unset(input.opportunityName),
        OPPORTUNITY_DETAILS: unset(input.opportunityDetails),
        OPPORTUNITY_STATE: unset(input.opportunityState),
        ORGANISATION_ID: input.organisationId,
        RESPONSIBLE_USER_ID: input.responsibleUserId,
        BID_AMOUNT: input.bidAmount,
        BID_CURRENCY: unset(input.bidCurrency),
        PROBABILITY: input.probability,
        FORECAST_CLOSE_DATE: unset(input.forecastCloseDate),
        ACTUAL_CLOSE_DATE: unset(input.actualCloseDate),
      }),
    });
  },
};

export default opportunityUpdate;
