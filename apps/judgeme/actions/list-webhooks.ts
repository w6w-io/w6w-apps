import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /webhooks` — Index.
 *
 * Unlike every reviews/reviewers/shops/settings/replies operation, the
 * webhook paths carry no per-operation `security:` block at all — so they
 * fall back to the document's top-level default
 * (`PrivateAPIKey`+`ShopDomain` or `OAuthAPIKey`), which is exactly what this
 * app's single auth method already signs every request with.
 */
interface Output {
  shopId?: number;
  shopDomain?: string;
  webhooks: unknown[];
}

const listWebhooks: ActionDefinition<Record<string, never>, Output> = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks registered for the connected shop.",
  params: [],
  output: [
    { key: "shopId", type: "number", label: "Judge.me shop id" },
    { key: "shopDomain", type: "string", label: "Shop domain" },
    { key: "webhooks", type: "array", label: "Webhooks" },
  ],

  async execute(_input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{
      shop_id?: number;
      shop_domain?: string;
      webhooks?: unknown[];
    }>("/webhooks");
    return {
      shopId: body?.shop_id,
      shopDomain: body?.shop_domain,
      webhooks: body?.webhooks ?? [],
    };
  },
};

export default listWebhooks;
