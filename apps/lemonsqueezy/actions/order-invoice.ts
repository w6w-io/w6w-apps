import type { ActionDefinition } from "@w6w/types";
import { compact, LemonSqueezyClient } from "../lib/client.ts";

/**
 * `POST /v1/orders/:id/generate-invoice`.
 *
 * Unlike every other write in this app, the vendor's own example sends these
 * as **query-string parameters on the POST**, not a JSON:API body — verified
 * against the documented curl example, which appends `?name=...&address=...`
 * to the URL and sends no `-d` payload.
 *
 * The vendor's docs also carry a live deprecation notice: "Please be aware
 * that the fields `name`, `address`, `city`, `state`, `zip_code`, and
 * `country` will soon become required." They are already marked `required`
 * here (state only for US/CA) so a workflow built today keeps working after
 * that change ships.
 */
interface Input {
  orderId: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  notes?: string;
  locale?: string;
}

const orderInvoice: ActionDefinition<Input> = {
  key: "order-invoice",
  type: "perform",
  resource: "order",
  title: "Generate Order Invoice",
  description: "Generate a downloadable invoice PDF link for an order, addressed to the given " +
    "billing details.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    { key: "name", label: "Customer name", type: "string", required: true },
    { key: "address", label: "Street address", type: "string", required: true },
    { key: "city", label: "City", type: "string", required: true },
    {
      key: "state",
      label: "State",
      type: "string",
      hint: "Required for US and CA addresses.",
    },
    { key: "zipCode", label: "ZIP / postal code", type: "string", required: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint: "ISO 3166-1 two-letter country code, e.g. `US`, `GB`.",
    },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      hint: "ISO 639 language code for the invoice, e.g. `en`.",
    },
  ],
  output: [{ key: "meta", type: "object", label: "`{ urls: { download_invoice } }`" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/orders/${encodeURIComponent(input.orderId)}/generate-invoice`,
      {
        method: "POST",
        query: compact({
          name: input.name,
          address: input.address,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          country: input.country,
          notes: input.notes,
          locale: input.locale,
        }) as Record<string, string>,
      },
    );
  },
};

export default orderInvoice;
