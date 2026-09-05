import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `GET /v1/discounts/{discount_id}` — verified against `getDiscountById`, 2026-09-05. */
interface Input {
  discountId: string;
}

const discountGet: ActionDefinition<Input> = {
  key: "discount-get",
  type: "read",
  resource: "discount",
  title: "Get Discount",
  description: "Fetch a single discount by ID.",
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
    { key: "id", type: "string", label: "Discount ID" },
    { key: "code", type: "string", label: "Code" },
    { key: "type", type: "string", label: "fixed_amount or percentage" },
    { key: "times_redeemed", type: "number", label: "Times redeemed" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/discounts/${encodeURIComponent(input.discountId)}`,
    );
  },
};

export default discountGet;
