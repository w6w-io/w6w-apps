import { assert, assertEquals } from "@std/assert";
import createReview from "../../actions/create-review.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-review: requires no auth and no connection", () => {
  assertEquals(createReview.requiresAuth, false);
  assertEquals(createReview.idempotent, false);
});

Deno.test("create-review: posts shop_domain/platform in the body, not as auth", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await createReview.execute({
    shopDomain: "example.myshopify.com",
    platform: "shopify",
    email: "buyer@example.com",
    name: "Jane Buyer",
    rating: 5,
    body: "Loved it!",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/reviews");
  assert(!calls[0].headers["x-api-token"], "create-review must not carry a credential header");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.shop_domain, "example.myshopify.com");
  assertEquals(sent.platform, "shopify");
  assertEquals(sent.email, "buyer@example.com");
  assertEquals(sent.rating, 5);
  assertEquals(sent.body, "Loved it!");
  assert(!("id" in sent), "unset productExternalId must not be sent");
});

Deno.test("create-review: forwards optional product id, cf answers and picture urls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await createReview.execute({
    shopDomain: "example.myshopify.com",
    platform: "woocommerce",
    productExternalId: 999,
    email: "buyer@example.com",
    name: "Jane Buyer",
    rating: 4,
    body: "Pretty good",
    cfAnswers: [{ cf_question_id: 1, value: "Yellow" }],
    pictureUrls: ["https://example.com/a.jpg"],
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.id, 999);
  assertEquals(sent.cf_answers, [{ cf_question_id: 1, value: "Yellow" }]);
  assertEquals(sent.picture_urls, ["https://example.com/a.jpg"]);
});
