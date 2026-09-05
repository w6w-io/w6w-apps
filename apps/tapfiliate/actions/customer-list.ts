import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { dateRangeParams, pageParam, programIdParam } from "../lib/params.ts";

/**
 * `GET /customers/{?program_id,customer_id,affiliate_id,date_from,date_to}`
 *
 * The one `program_id` param here is optional, unlike the required version on
 * most other by-program filters — the docs' own example omits it as often as
 * they include it.
 */
interface Input {
  programId?: string;
  customerId?: string;
  affiliateId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers, optionally filtered by program, your own customer id, or affiliate.",
  params: [
    { ...programIdParam, key: "programId", required: false },
    {
      key: "customerId",
      label: "Your customer id",
      type: "string",
      hint: "The id for this customer in your own system, as passed when the customer was created.",
    },
    { key: "affiliateId", label: "Affiliate", type: "string" },
    ...dateRangeParams(),
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Customers" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/customers/", {
      query: compact({
        program_id: input.programId,
        customer_id: input.customerId,
        affiliate_id: input.affiliateId,
        date_from: input.dateFrom,
        date_to: input.dateTo,
        page: input.page,
      }),
    });
  },
};

export default customerList;
