import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /shops/info` — plan, owner, email, platform and other store metadata.
 *
 * The document's own response documentation is malformed for this operation:
 * the `200` response points at an empty schema
 * (`components.responses.success_200`, `content: {"application/json": {}}`),
 * and the only evidence of an actual shape — a `shop: {id, awesome, country,
 * ...}` object — is a request/response example attached to `requestBody`,
 * even though this is a `GET` with no request body of its own. That example
 * is the only signal the document gives, so this action returns `shop` when
 * present and falls back to the raw body otherwise, rather than assuming a
 * schema the vendor never actually declared.
 */
const getShopInfo: ActionDefinition<Record<string, never>> = {
  key: "get-shop-info",
  type: "read",
  resource: "shop",
  title: "Get Shop Info",
  description:
    "Read the connected store's Judge.me plan, owner, email, platform and related metadata. " +
    "The vendor's OpenAPI document does not give this endpoint a real response schema — see the " +
    "source comment for what that means here.",
  params: [],
  output: [
    { key: "shop", type: "object", label: "Shop info" },
  ],

  async execute(_input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ shop?: Record<string, unknown> }>(
      "/shops/info",
    );
    return { shop: body?.shop ?? body };
  },
};

export default getShopInfo;
