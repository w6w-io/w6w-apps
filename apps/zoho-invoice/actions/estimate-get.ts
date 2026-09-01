import type { ActionDefinition } from "@w6w/types";
import { invoiceGet, type InvoiceGetInput } from "../lib/invoice.ts";
import { organizationId, recordId } from "../lib/params.ts";

const estimateGet: ActionDefinition<InvoiceGetInput> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Retrieve one estimate by id.",
  params: [{ ...recordId, hint: "The Zoho Invoice estimate id." }, organizationId],
  output: [{ key: "estimate_id", type: "string", label: "Estimate ID" }],

  execute(input, ctx) {
    return invoiceGet(ctx, "/estimates", "estimate", input);
  },
};

export default estimateGet;
