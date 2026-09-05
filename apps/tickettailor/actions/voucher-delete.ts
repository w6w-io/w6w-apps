import type { ActionDefinition } from "@w6w/types";
import type { DeleteResult } from "../lib/client.ts";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `DELETE /v1/vouchers/{voucher_id}` — verified against `deleteVoucherById`,
 * 2026-09-05. Irreversible: deletes the voucher AND its voucher codes.
 * Answers `200` with a small JSON body, never `204` — see `lib/client.ts`.
 */
interface Input {
  voucherId: string;
}

const voucherDelete: ActionDefinition<Input, DeleteResult> = {
  key: "voucher-delete",
  type: "perform",
  resource: "voucher",
  title: "Delete Voucher",
  description: "Permanently delete a voucher and its voucher codes. Irreversible.",
  idempotent: false,
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
    { key: "id", type: "string", label: "Deleted voucher ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "deleted", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<DeleteResult>(
      `/vouchers/${encodeURIComponent(input.voucherId)}`,
      { method: "DELETE" },
    );
  },
};

export default voucherDelete;
