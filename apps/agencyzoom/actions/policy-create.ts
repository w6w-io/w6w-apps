import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, compact, type GenericSuccessResponse } from "../lib/client.ts";

/**
 * `POST /v1/api/policies/create` — write a new policy for an existing
 * customer.
 *
 * ## This endpoint documents a second, undocumented-origin auth requirement
 *
 * Alongside the usual `security: bearer`, the OpenAPI document also declares a
 * required `X-Api-Token` header parameter here — the ONLY endpoint in the
 * entire 316 KB document that does. Nothing else in the API names a distinct
 * "API token" concept (no such field on login, no settings-page token), so
 * `auth/login.ts`'s `sign` hook stamps this header with the same JWT that
 * signs everything else, specifically for requests to this path. See that
 * file for the full reasoning.
 *
 * `premium`/`brokerFee` are in **cents** — the vendor's own words this time
 * ("The policy premium amount in cents"). Dates here are `MM/dd/YYYY`.
 */
interface Input {
  customerId: number;
  insuredName?: string;
  carrierId?: number;
  standardCarrierCode?: string;
  soldDate: string;
  agentId: number;
  policyType: number;
  policyNumber?: string;
  premium: number;
  brokerFee?: number;
  items: number;
  leadSourceId: number;
  agencyNumber: string;
  effectiveDate: string;
  expiryDate: string;
}

const policyCreate: ActionDefinition<Input> = {
  key: "policy-create",
  type: "perform",
  resource: "policy",
  title: "Create Policy",
  description: "Write a new policy for an existing customer.",
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "insuredName", label: "Insured name(s)", type: "string" },
    { key: "carrierId", label: "Carrier ID", type: "number", hint: "From List Carriers." },
    { key: "standardCarrierCode", label: "Standard Carrier Code", type: "string" },
    { key: "soldDate", label: "Sold date", type: "string", required: true, hint: "MM/dd/YYYY." },
    {
      key: "agentId",
      label: "Producer/agent ID",
      type: "number",
      required: true,
      hint: "From List Employees.",
    },
    {
      key: "policyType",
      label: "Policy type ID",
      type: "number",
      required: true,
      hint: "From List Product Lines.",
    },
    { key: "policyNumber", label: "Policy number", type: "string" },
    { key: "premium", label: "Premium (in cents)", type: "number", required: true },
    { key: "brokerFee", label: "Broker fee (in cents)", type: "number" },
    { key: "items", label: "Number of items", type: "number", required: true },
    {
      key: "leadSourceId",
      label: "Lead source ID",
      type: "number",
      required: true,
      hint: "From List Lead Sources.",
    },
    {
      key: "agencyNumber",
      label: "Location number",
      type: "string",
      required: true,
      hint: "From List Locations.",
    },
    {
      key: "effectiveDate",
      label: "Effective date",
      type: "string",
      required: true,
      hint: "MM/dd/YYYY.",
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "string",
      required: true,
      hint: "MM/dd/YYYY.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New policy ID" },
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<GenericSuccessResponse>(
      "/policies/create",
      compact({ ...input }),
    );
  },
};

export default policyCreate;
