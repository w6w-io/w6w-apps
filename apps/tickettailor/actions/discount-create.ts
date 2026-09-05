import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient, toList } from "../lib/client.ts";

/**
 * `POST /v1/discounts` — verified against `createDiscountCode`, 2026-09-05.
 * `price`/`booking_fee` (cents) and `price_percent`/`booking_fee_percent`
 * (0-100) are mutually exclusive pairs per `type`; the vendor does not
 * document what happens if both are set for one type, so this action sends
 * exactly what the caller fills in and lets Ticket Tailor's own validation
 * (`errors[]` in the error body) reject an inconsistent combination.
 */
interface Input {
  name: string;
  code: string;
  type: "fixed_amount" | "percentage";
  price?: number;
  pricePercent?: number;
  bookingFee?: number;
  bookingFeePercent?: number;
  maxRedemptions?: number;
  expires?: number;
  ticketTypes?: string[] | string;
  products?: string[] | string;
}

const discountCreate: ActionDefinition<Input> = {
  key: "discount-create",
  type: "perform",
  resource: "discount",
  title: "Create Discount",
  description: "Create a discount code redeemable at checkout.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Early bird" },
    { key: "code", label: "Code", type: "string", required: true, placeholder: "EARLYBIRD" },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Fixed amount off", value: "fixed_amount" },
        { label: "Percentage off", value: "percentage" },
      ],
    },
    { key: "price", label: "Price (smallest currency unit, for fixed_amount)", type: "number" },
    { key: "pricePercent", label: "Price percent 0-100 (for percentage)", type: "number" },
    { key: "bookingFee", label: "Booking fee (smallest currency unit)", type: "number" },
    { key: "bookingFeePercent", label: "Booking fee percent 0-100", type: "number" },
    { key: "maxRedemptions", label: "Max redemptions", type: "number" },
    { key: "expires", label: "Expiry (Unix timestamp)", type: "number" },
    {
      key: "ticketTypes",
      label: "Ticket type IDs",
      type: "string",
      hint: "Comma-separated ticket type IDs (tt_...) this discount applies to.",
    },
    {
      key: "products",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated product IDs (pr_...) this discount applies to.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Discount ID" },
    { key: "code", type: "string", label: "Code" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/discounts", {
      method: "POST",
      form: {
        name: input.name,
        code: input.code,
        type: input.type,
        price: input.price,
        price_percent: input.pricePercent,
        booking_fee: input.bookingFee,
        booking_fee_percent: input.bookingFeePercent,
        max_redemptions: input.maxRedemptions,
        expires: input.expires,
        ticket_types: toList(input.ticketTypes),
        products: toList(input.products),
      },
    });
  },
};

export default discountCreate;
