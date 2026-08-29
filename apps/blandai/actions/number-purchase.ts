import type { ActionDefinition } from "@w6w/types";
import { BlandClient, compact } from "../lib/client.ts";

/**
 * `POST /numbers/purchase` — buy a new phone number ($15/mo, per the vendor's
 * own docs, billed to the account's stored payment method).
 *
 * Verified against `docs.bland.ai/api-v1/post/inbound-purchase`. This
 * endpoint is NOT under `/v1` — confirmed via `llms-full.txt`'s
 * `POST https://api.bland.ai/numbers/purchase` line, and via a live probe
 * (an unauthenticated request answers the same `401 AUTH_FAILURE` envelope
 * every other endpoint does, confirming the host and path are real).
 */
interface Input {
  areaCode?: string;
  countryCode?: string;
  phoneNumber?: string;
}

const numberPurchase: ActionDefinition<Input> = {
  key: "number-purchase",
  type: "perform",
  resource: "number",
  title: "Purchase Phone Number",
  description:
    "Purchase a new phone number ($15/mo, billed to the account's stored payment method).",
  // Every call purchases and bills a distinct number — never safe to retry blindly.
  idempotent: false,
  params: [
    { key: "areaCode", label: "Area Code", type: "string", default: "415" },
    {
      key: "countryCode",
      label: "Country",
      type: "select",
      default: "US",
      options: [
        { label: "United States", value: "US" },
        { label: "Canada", value: "CA" },
      ],
    },
    {
      key: "phoneNumber",
      label: "Exact Phone Number",
      type: "string",
      hint: "If set, overrides areaCode and purchases this exact number, e.g. +12223334444.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Purchase result" },
  ],

  async execute(input, ctx) {
    const body = compact({
      area_code: input.phoneNumber ? undefined : input.areaCode,
      country_code: input.countryCode,
      phone_number: input.phoneNumber,
    });
    const result = await new BlandClient(ctx).request<Record<string, unknown>>(
      "/numbers/purchase",
      { method: "POST", body },
    );
    return { result };
  },
};

export default numberPurchase;
