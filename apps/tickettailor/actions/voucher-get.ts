import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/vouchers/{voucher_id}` — verified against `getVoucherById`, 2026-09-05. */
interface Input {
  voucherId: string;
}

const voucherGet: ActionDefinition<Input> = {
  key: "voucher-get",
  type: "read",
  resource: "voucher",
  title: "Get Voucher",
  description: "Fetch a single voucher by ID.",
  params: [
    {
      key: "voucherId",
      label: "Voucher ID",
      type: "string",
      required: true,
      placeholder: "vo_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Voucher ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "PROMO or GIFT_CARD" },
    { key: "value", type: "number", label: "Value (smallest currency unit)" },
    { key: "available_codes", type: "number", label: "Unused codes" },
    { key: "total_codes", type: "number", label: "Total codes" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(`/vouchers/${encodeURIComponent(input.voucherId)}`);
  },
};

export default voucherGet;
