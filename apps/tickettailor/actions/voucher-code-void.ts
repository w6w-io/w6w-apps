import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/vouchers/{voucher_id}/codes/{voucher_code_id}/void` — verified
 * against `voidVoucherCodeById`, 2026-09-05. Irreversible; voids only this
 * one code, leaving sibling codes on the same voucher untouched.
 */
interface Input {
  voucherId: string;
  voucherCodeId: string;
}

const voucherCodeVoid: ActionDefinition<Input> = {
  key: "voucher-code-void",
  type: "perform",
  resource: "voucher-code",
  title: "Void Voucher Code",
  description: "Mark a single voucher code as voided. Irreversible.",
  idempotent: true,
  params: [
    {
      key: "voucherId",
      label: "Voucher ID",
      type: "string",
      required: true,
      placeholder: "vo_123",
    },
    {
      key: "voucherCodeId",
      label: "Voucher Code ID",
      type: "string",
      required: true,
      placeholder: "vc_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Voided voucher code ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "voided", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/vouchers/${encodeURIComponent(input.voucherId)}/codes/${
        encodeURIComponent(input.voucherCodeId)
      }/void`,
      { method: "POST" },
    );
  },
};

export default voucherCodeVoid;
