import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient, toList } from "../lib/client.ts";

/**
 * `POST /v1/vouchers` — verified against `createVoucher`, 2026-09-05.
 * `codes` (only meaningful for `voucher_type: PROMO`) is sent as repeated
 * `codes[]` form fields.
 */
interface Input {
  name: string;
  value: number;
  voucherType?: "PROMO" | "GIFT_CARD";
  codes?: string[] | string;
  eventSeriesIds?: string[] | string;
  expires?: number;
  /** A `select`'s value always arrives as a string. */
  interval?: "30" | "90" | "365";
  partialRedemption?: "true" | "false";
  usableOnAnyEvent?: "true" | "false";
}

const voucherCreate: ActionDefinition<Input> = {
  key: "voucher-create",
  type: "perform",
  resource: "voucher",
  title: "Create Voucher",
  description: "Create a voucher (promo code or gift card) and its voucher codes.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Launch gift card" },
    { key: "value", label: "Value (smallest currency unit)", type: "number", required: true },
    {
      key: "voucherType",
      label: "Voucher type",
      type: "select",
      default: "PROMO",
      options: [
        { label: "Promo code", value: "PROMO" },
        { label: "Gift card", value: "GIFT_CARD" },
      ],
    },
    {
      key: "codes",
      label: "Codes",
      type: "string",
      hint: "Comma-separated codes to create (PROMO only).",
    },
    {
      key: "eventSeriesIds",
      label: "Event Series IDs",
      type: "string",
      hint: "Comma-separated event series IDs this voucher can be used on.",
    },
    { key: "expires", label: "Expiry (Unix timestamp)", type: "number" },
    {
      key: "interval",
      label: "Expiry interval in days (GIFT_CARD only)",
      type: "select",
      options: [
        { label: "30 days", value: "30" },
        { label: "90 days", value: "90" },
        { label: "365 days", value: "365" },
      ],
    },
    {
      key: "partialRedemption",
      label: "Allow partial redemption",
      type: "select",
      options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }],
    },
    {
      key: "usableOnAnyEvent",
      label: "Usable on any event",
      type: "select",
      options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Voucher ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "total_codes", type: "number", label: "Total codes created" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/vouchers", {
      method: "POST",
      form: {
        name: input.name,
        value: input.value,
        voucher_type: input.voucherType,
        codes: toList(input.codes),
        event_series_ids: toList(input.eventSeriesIds),
        expiry: input.expires,
        interval: input.interval,
        partial_redemption: input.partialRedemption,
        usable_on_any_event: input.usableOnAnyEvent,
      },
    });
  },
};

export default voucherCreate;
