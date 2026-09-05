import { assertEquals } from "@std/assert";
import createWebhook from "../../actions/create-webhook.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-webhook: posts a nested webhook.key/webhook.url", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        shop_id: 1,
        shop_domain: "example.myshopify.com",
        webhook: { id: 5, key: "review/created", url: "https://example.com/hook" },
      },
    },
  ]);
  const out = await createWebhook.execute(
    { key: "review/created", url: "https://example.com/hook" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    webhook: { key: "review/created", url: "https://example.com/hook" },
  });
  assertEquals(out.webhook, { id: 5, key: "review/created", url: "https://example.com/hook" });
});

Deno.test("create-webhook: every option is one of the document's enumerated webhook_key values", () => {
  const keyParam = createWebhook.params?.find((p) => p.key === "key");
  const options = keyParam?.options as Array<{ value: string }>;
  const documented = new Set([
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
  ]);
  assertEquals(options.length, documented.size);
  for (const o of options) {
    if (!documented.has(o.value)) throw new Error(`undocumented webhook key: ${o.value}`);
  }
});
