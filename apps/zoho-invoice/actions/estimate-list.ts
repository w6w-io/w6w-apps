import type { ActionDefinition } from "@w6w/types";
import { invoiceList, type InvoiceListInput, type InvoiceListResult } from "../lib/invoice.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends InvoiceListInput {
  zcrmPotentialId?: string;
}

/**
 * Zoho Invoice's List Estimates endpoint documents exactly three query
 * parameters — `zcrm_potential_id`, `page`, `per_page` — verified 2026-09-01
 * against `https://www.zoho.com/invoice/api/v3/estimates/`'s own "List
 * estimates" section. No `customer_id` or `status` filter is documented
 * here, unlike List Invoices (which has both); this action deliberately
 * does not invent them.
 */
const estimateList: ActionDefinition<Input, InvoiceListResult<Record<string, unknown>>> = {
  key: "estimate-list",
  type: "read",
  resource: "estimate",
  title: "List Estimates",
  description: "List estimates.",
  params: [
    organizationId,
    {
      key: "zcrmPotentialId",
      label: "CRM Potential ID",
      type: "string",
      hint: "Filter to estimates linked to one Zoho CRM Deal.",
    },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Estimates" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return invoiceList(ctx, "/estimates", "estimates", input, {
      zcrm_potential_id: input.zcrmPotentialId,
    });
  },
};

export default estimateList;
