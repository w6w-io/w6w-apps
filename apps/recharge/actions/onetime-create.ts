import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";

interface Input {
  addressId: number;
  externalVariantId: string;
  quantity: number;
  nextChargeScheduledAt?: string;
  addToNextCharge?: boolean;
  price?: string;
  productTitle?: string;
  externalProductId?: string;
  sku?: string;
}

/**
 * `POST /onetimes` — create a one-time purchase. Scope:
 * `write_subscriptions`.
 *
 * `next_charge_scheduled_at` and `add_to_next_charge` are documented mutually
 * exclusive — the reference states the first "Cannot be used with
 * add_to_next_charge".
 *
 * Response envelope: `{"onetime": {...}}`.
 */
const onetimeCreate: ActionDefinition<Input> = {
  key: "onetime-create",
  type: "perform",
  resource: "onetime",
  title: "Create Onetime",
  description: "Create a new one-time purchase on a customer's address.",
  idempotent: false,
  params: [
    { key: "addressId", label: "Address ID", type: "number", required: true },
    {
      key: "externalVariantId",
      label: "External variant ID",
      type: "string",
      required: true,
      hint: "The product variant id in the connected ecommerce platform.",
    },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    {
      key: "nextChargeScheduledAt",
      label: "Charge date",
      type: "datetime",
      hint: "Cannot be used together with Add to next charge.",
    },
    {
      key: "addToNextCharge",
      label: "Add to next charge",
      type: "boolean",
      hint: "Adds this onetime to the address's next scheduled charge instead of a specific date.",
    },
    { key: "price", label: "Price", type: "string" },
    { key: "productTitle", label: "Product title", type: "string" },
    { key: "externalProductId", label: "External product ID", type: "string" },
    { key: "sku", label: "SKU", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Onetime ID" },
    { key: "next_charge_scheduled_at", type: "string", label: "Charge date" },
    { key: "is_cancelled", type: "boolean", label: "Cancelled" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single("/onetimes", "onetime", {
      method: "POST",
      body: compact({
        address_id: input.addressId,
        external_variant_id: { ecommerce: input.externalVariantId },
        quantity: input.quantity,
        next_charge_scheduled_at: input.nextChargeScheduledAt,
        add_to_next_charge: input.addToNextCharge,
        price: input.price,
        product_title: input.productTitle,
        external_product_id: input.externalProductId
          ? { ecommerce: input.externalProductId }
          : undefined,
        sku: input.sku,
      }),
    });
  },
};

export default onetimeCreate;
