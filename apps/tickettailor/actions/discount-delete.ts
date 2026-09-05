import type { ActionDefinition } from "@w6w/types";
import type { DeleteResult } from "../lib/client.ts";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `DELETE /v1/discounts/{discount_id}` — verified against
 * `deleteDiscountById`, 2026-09-05. Irreversible. Answers `200` with a small
 * JSON body, never `204` — see `lib/client.ts`.
 */
interface Input {
  discountId: string;
}

const discountDelete: ActionDefinition<Input, DeleteResult> = {
  key: "discount-delete",
  type: "perform",
  resource: "discount",
  title: "Delete Discount",
  description: "Permanently delete a discount. Irreversible.",
  idempotent: false,
  params: [
    {
      key: "discountId",
      label: "Discount ID",
      type: "string",
      required: true,
      placeholder: "di_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted discount ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "deleted", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<DeleteResult>(
      `/discounts/${encodeURIComponent(input.discountId)}`,
      { method: "DELETE" },
    );
  },
};

export default discountDelete;
