import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/vouchers` — verified against `getVoucherList`, 2026-09-05. */
interface Input {
  limit?: number;
}

const voucherList: ActionDefinition<Input> = {
  key: "voucher-list",
  type: "read",
  resource: "voucher",
  title: "List Vouchers",
  description: "List vouchers (promo codes or gift cards), paginated.",
  params: [{ key: "limit", label: "Limit", type: "number" }],
  output: [{ key: "data", type: "array", label: "Vouchers" }],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/vouchers", {
      query: { limit: input.limit },
    });
  },
};

export default voucherList;
