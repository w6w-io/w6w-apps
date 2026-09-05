import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

const WEBHOOK_KEYS = [
  "widget/settings/updated",
  "widget/review_widget/updated",
  "widget/preview_badge/updated",
  "widget/all_reviews_count/updated",
  "widget/all_reviews_rating/updated",
  "widget/shop_reviews_count/updated",
  "widget/shop_reviews_rating/updated",
  "widget/verified_badge/updated",
  "widget/all_reviews_page/updated",
  "widget/featured_carousel/updated",
  "widget/reviews_tab/updated",
  "widget/html_miracle/updated",
  "widget/product_comment/updated",
  "review/created",
  "review/updated",
  "review/created_fail",
] as const;

/**
 * `POST /webhooks` — Create.
 *
 * `key` is one of the document's enumerated `webhook_key` values (copied
 * verbatim here as the select's options); `url` is the endpoint Judge.me
 * POSTs the event to.
 */
interface Input {
  key: typeof WEBHOOK_KEYS[number];
  url: string;
}

interface Output {
  shopId?: number;
  shopDomain?: string;
  webhook?: unknown;
}

const createWebhook: ActionDefinition<Input, Output> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to a Judge.me event.",
  idempotent: false,
  params: [
    {
      key: "key",
      label: "Event Key",
      type: "select",
      required: true,
      options: WEBHOOK_KEYS.map((k) => ({ value: k, label: k })),
    },
    { key: "url", label: "Webhook URL", type: "string", required: true },
  ],
  output: [
    { key: "shopId", type: "number", label: "Judge.me shop id" },
    { key: "shopDomain", type: "string", label: "Shop domain" },
    { key: "webhook", type: "object", label: "Created webhook" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{
      shop_id?: number;
      shop_domain?: string;
      webhook?: unknown;
    }>("/webhooks", { method: "POST", body: { webhook: { key: input.key, url: input.url } } });
    return { shopId: body?.shop_id, shopDomain: body?.shop_domain, webhook: body?.webhook };
  },
};

export default createWebhook;
