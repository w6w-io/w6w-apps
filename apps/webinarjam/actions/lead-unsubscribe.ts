import type { ActionDefinition } from "@w6w/types";
import { type Product, PRODUCT_OPTIONS, WebinarJamClient } from "../lib/client.ts";

/**
 * `POST /{product}/unsubscribe` — stop future webinar notifications for a
 * lead. Verified against WebinarJam (article 15370153) and EverWebinar
 * (15370160): identical two fields (`webinar_id`, `lead_id`) both times, and
 * both articles state the same success shape — a bare `204 No Content`, no
 * JSON body — which `WebinarJamClient.request` returns as `undefined`.
 *
 * `leadId` must come from a prior `registrant-list` call: each row's `id`
 * field is the lead id this endpoint expects (the docs call it `lead_id` on
 * the request but the registrants list's own rows key it as plain `id`).
 *
 * Marked idempotent: unsubscribing is a state-set ("stop sending this lead
 * notifications"), not a create — the docs describe no side effect beyond
 * that state flip, so repeating the call against an already-unsubscribed lead
 * has nothing further to do.
 */
interface Input {
  product: Product;
  webinarId: number;
  leadId: number;
}

const leadUnsubscribe: ActionDefinition<Input> = {
  key: "lead-unsubscribe",
  type: "perform",
  resource: "registrant",
  title: "Unsubscribe Lead",
  description: "Stop further webinar notifications for a registrant.",
  idempotent: true,
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      required: true,
      default: "webinarjam",
      options: PRODUCT_OPTIONS,
    },
    { key: "webinarId", label: "Webinar ID", type: "number", required: true },
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The `id` field of a row from List Registrants.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Unsubscribed" },
  ],

  async execute(input, ctx) {
    await new WebinarJamClient(ctx).request(input.product, "/unsubscribe", {
      webinar_id: input.webinarId,
      lead_id: input.leadId,
    });
    return { success: true };
  },
};

export default leadUnsubscribe;
