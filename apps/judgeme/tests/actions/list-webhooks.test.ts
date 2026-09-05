import { assertEquals } from "@std/assert";
import listWebhooks from "../../actions/list-webhooks.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-webhooks: GETs /webhooks and unwraps shop_id/shop_domain/webhooks", async () => {
  const { ctx, calls } = mockCtx([
    { body: { shop_id: 1, shop_domain: "example.myshopify.com", webhooks: [{ id: 1 }] } },
  ]);
  const out = await listWebhooks.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assertEquals(out, {
    shopId: 1,
    shopDomain: "example.myshopify.com",
    webhooks: [{ id: 1 }],
  });
});

Deno.test("list-webhooks: defaults webhooks to []", async () => {
  const { ctx } = mockCtx([{ body: { shop_id: 1 } }]);
  const out = await listWebhooks.execute({}, ctx);
  assertEquals(out.webhooks, []);
});
