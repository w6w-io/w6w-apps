import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/discounts/{discount_id}` — verified against `updateDiscountById`,
 * 2026-09-05. This action exposes the scalar fields only; the vendor's
 * `ticket_types`/`products` update fields are association maps
 * (`{tt_123: "1"}`, add/remove/no-op) rather than plain arrays — left out
 * here rather than guessed at, since getting the add/remove semantics wrong
 * would silently detach a discount from tickets it should still apply to.
 * Use `discount-create` to set associations at creation time.
 */
interface Input {
  discountId: string;
  name?: string;
  code?: string;
  price?: number;
  pricePercent?: number;
  maxRedemptions?: number;
  expires?: number;
}

const discountUpdate: ActionDefinition<Input> = {
  key: "discount-update",
  type: "perform",
  resource: "discount",
  title: "Update Discount",
  description: "Update a discount's name, code, price, or expiry.",
  idempotent: true,
  params: [
    {
      key: "discountId",
      label: "Discount ID",
      type: "string",
      required: true,
      placeholder: "di_123",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "code", label: "Code", type: "string" },
    { key: "price", label: "Price (smallest currency unit)", type: "number" },
    { key: "pricePercent", label: "Price percent 0-100", type: "number" },
    { key: "maxRedemptions", label: "Max redemptions", type: "number" },
    { key: "expires", label: "Expiry (Unix timestamp)", type: "number" },
  ],
  output: [
    { key: "id", type: "string", label: "Discount ID" },
    { key: "code", type: "string", label: "Code" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/discounts/${encodeURIComponent(input.discountId)}`,
      {
        method: "POST",
        form: {
          name: input.name,
          code: input.code,
          price: input.price,
          price_percent: input.pricePercent,
          max_redemptions: input.maxRedemptions,
          expires: input.expires,
        },
      },
    );
  },
};

export default discountUpdate;
