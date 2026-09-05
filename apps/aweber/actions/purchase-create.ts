import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import { accountIdParam, asOptionalJson, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/purchases` — record an
 * e-commerce purchase (or any tracked value event) against a subscriber.
 *
 * AWeber's own description: "this endpoint creates a purchase ... for a
 * subscriber. If the subscriber does not exist, it is created. If the
 * subscriber exists, then it will be updated. This endpoint combines 3 api
 * calls into one" — so a single call here can both add a new subscriber and
 * tag/track them, which is worth knowing before wiring it into a checkout
 * webhook that might fire for people not already on the list.
 *
 * Not idempotent: nothing here dedupes by an order id, so retrying creates a
 * second purchase record.
 */
interface Input {
  accountId: string;
  listId: string;
  email: string;
  value: number;
  currency?: string;
  productName?: string;
  vendor?: string;
  url?: string;
  eventTime?: string;
  eventNote?: string;
  name?: string;
  tags?: string[] | string;
  customFields?: unknown;
  ipAddress?: string;
  miscNotes?: string;
  adTracking?: string;
}

const purchaseCreate: ActionDefinition<Input> = {
  key: "purchase-create",
  type: "perform",
  resource: "purchase",
  title: "Record Purchase",
  description: "Record a purchase (or any tracked value event) against a subscriber, creating " +
    "or updating them in the process.",
  idempotent: false,
  params: [
    accountIdParam,
    listIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    { key: "value", label: "Value", type: "number", required: true },
    { key: "currency", label: "Currency", type: "string", placeholder: "USD" },
    { key: "productName", label: "Product name", type: "string" },
    { key: "vendor", label: "Vendor / platform", type: "string" },
    { key: "url", label: "URL", type: "string" },
    { key: "eventTime", label: "Event time", type: "datetime" },
    { key: "eventNote", label: "Event note", type: "string" },
    { key: "name", label: "Subscriber name", type: "string" },
    { key: "tags", label: "Tags", type: "multiselect" },
    { key: "customFields", label: "Custom fields", type: "json" },
    { key: "ipAddress", label: "IP address", type: "string" },
    { key: "miscNotes", label: "Notes", type: "string" },
    { key: "adTracking", label: "Ad tracking", type: "string" },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const body = compact({
      email: input.email,
      value: input.value,
      currency: input.currency,
      product_name: input.productName,
      vendor: input.vendor,
      url: input.url,
      event_time: input.eventTime,
      event_note: input.eventNote,
      name: input.name,
      tags: Array.isArray(input.tags) ? input.tags : input.tags ? [input.tags] : undefined,
      custom_fields: asOptionalJson<Record<string, string>>(input.customFields, "Custom fields"),
      ip_address: input.ipAddress,
      misc_notes: input.miscNotes,
      ad_tracking: input.adTracking,
    });

    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/purchases`,
      { method: "POST", body },
    );
    return { status: res.status };
  },
};

export default purchaseCreate;
