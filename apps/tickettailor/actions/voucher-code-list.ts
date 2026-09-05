import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/vouchers/{voucher_id}/codes` — verified against `getVoucherCodeList`, 2026-09-05. */
interface Input {
  voucherId: string;
  limit?: number;
}

const voucherCodeList: ActionDefinition<Input> = {
  key: "voucher-code-list",
  type: "read",
  resource: "voucher-code",
  title: "List Voucher Codes",
  description: "List the individual codes belonging to a voucher, paginated.",
  params: [
    {
      key: "voucherId",
      label: "Voucher ID",
      type: "string",
      required: true,
      placeholder: "vo_123",
    },
    { key: "limit", label: "Limit", type: "number" },
  ],
  output: [{ key: "data", type: "array", label: "Voucher codes" }],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>(
      `/vouchers/${encodeURIComponent(input.voucherId)}/codes`,
      { query: { limit: input.limit } },
    );
  },
};

export default voucherCodeList;
