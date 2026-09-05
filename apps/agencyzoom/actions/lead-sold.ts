import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, asJson } from "../lib/client.ts";

/**
 * `POST /v1/api/leads/{leadId}/sold` — mark a lead sold, turning it into a
 * customer with one or more written policies.
 *
 * `soldProducts` is a JSON array of `SoldProduct` objects (the vendor's own
 * schema); each needs `locationId` and `isSold`, plus (optional if a
 * `standard*Code` is given instead) `carrierId`/`productLineId`. `premium` is
 * in **cents** — see `lib/client.ts`. This app exposes it as one JSON param
 * rather than a fixed set of fields, because a lead is commonly sold with
 * several products at once and the platform's Param model has no native
 * "array of objects" input:
 *
 * ```json
 * [{ "locationId": "A0A0070", "isSold": true, "carrierId": 91,
 *    "productLineId": 25, "premium": 34500, "items": 1,
 *    "effectiveDate": "08/29/2019", "expiryDate": "08/29/2020" }]
 * ```
 *
 * Note the date format switches back to `MM/dd/YYYY` here, same as
 * `PolicyUpdateRequest` — see `lib/client.ts`.
 *
 * Response includes the new `customerId` — the lead's identity changes here,
 * from lead to customer.
 */
interface Input {
  leadId: number;
  soldProducts: unknown;
  keepOpen?: boolean;
}

const leadSold: ActionDefinition<Input> = {
  key: "lead-sold",
  type: "perform",
  resource: "lead",
  title: "Mark Lead Sold",
  description: "Mark a lead sold, creating a customer and one or more written policies.",
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    {
      key: "soldProducts",
      label: "Sold products (JSON array)",
      type: "json",
      required: true,
      hint: 'Array of SoldProduct objects, e.g. [{"locationId":"A0A0070","isSold":true,' +
        '"carrierId":91,"productLineId":25,"premium":34500,"items":1}]. premium is in cents; ' +
        "dates are MM/dd/YYYY. See this action's description for the full shape.",
    },
    {
      key: "keepOpen",
      label: "Keep lead open",
      type: "boolean",
      default: false,
      hint: "Keep the lead open too, for the case where part of it is still unsold.",
    },
  ],
  output: [
    { key: "customerId", type: "number", label: "New/existing customer ID" },
    { key: "opportunities", type: "array", label: "Resulting opportunities" },
  ],

  execute(input, ctx) {
    const soldProducts = asJson<unknown[]>(input.soldProducts, "soldProducts");
    return new AgencyZoomClient(ctx).post(`/leads/${input.leadId}/sold`, {
      soldProducts,
      keepOpen: input.keepOpen ?? false,
    });
  },
};

export default leadSold;
