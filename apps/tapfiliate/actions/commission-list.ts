import type { ActionDefinition } from "@w6w/types";
import { compact, flagStr, TapfiliateClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /commissions/{?affiliate_id,status,paid}`
 *
 * `paid` is documented as `1 | 0`, NOT `true`/`false` — the one query
 * parameter in this whole API that uses that encoding. See `lib/client.ts`'s
 * module doc.
 */
interface Input {
  affiliateId?: string;
  status?: "approved" | "disapproved" | "pending";
  paid?: boolean;
  page?: number;
}

const commissionList: ActionDefinition<Input> = {
  key: "commission-list",
  type: "search",
  resource: "commission",
  title: "List Commissions",
  description:
    "List commissions, optionally filtered by affiliate, approval status, or paid state.",
  params: [
    { key: "affiliateId", label: "Affiliate", type: "string" },
    {
      key: "status",
      label: "Approval status",
      type: "select",
      options: [
        { value: "approved", label: "Approved" },
        { value: "disapproved", label: "Disapproved" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "paid",
      label: "Paid out only",
      type: "boolean",
      hint: "Only show commissions that have been paid out.",
    },
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Commissions" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/commissions/", {
      query: compact({
        affiliate_id: input.affiliateId,
        status: input.status,
        paid: flagStr(input.paid),
        page: input.page,
      }),
    });
  },
};

export default commissionList;
