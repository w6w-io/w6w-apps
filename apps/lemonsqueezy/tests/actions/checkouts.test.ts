import { assert, assertEquals } from "@std/assert";
import checkoutList from "../../actions/checkout-list.ts";
import checkoutGet from "../../actions/checkout-get.ts";
import checkoutCreate from "../../actions/checkout-create.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("checkout-list: store_id and variant_id filters both survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await checkoutList.execute({ storeId: "1", variantId: "2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "1");
  assertEquals(url.searchParams.get("filter[variant_id]"), "2");
});

Deno.test("checkout-get: GET /v1/checkouts/:id, a UUID rather than an integer", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "abc-123", type: "checkouts" }) }]);
  await checkoutGet.execute({ checkoutId: "abc-123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/checkouts/abc-123");
});

Deno.test("checkout-create: POST with store + variant relationships", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "abc", type: "checkouts" }) }]);
  await checkoutCreate.execute({ storeId: "1", variantId: "2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.relationships.store, { data: { type: "stores", id: "1" } });
  assertEquals(body.data.relationships.variant, { data: { type: "variants", id: "2" } });
});

Deno.test("checkout-create: convenience fields nest under the right JSON:API object", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "abc", type: "checkouts" }) }]);
  await checkoutCreate.execute(
    {
      storeId: "1",
      variantId: "2",
      redirectUrl: "https://example.com/thanks",
      prefillEmail: "a@b.com",
      discountCode: "10OFF",
      embed: true,
      locale: "fr",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.product_options, {
    redirect_url: "https://example.com/thanks",
  });
  assertEquals(body.data.attributes.checkout_options, { embed: true, locale: "fr" });
  assertEquals(body.data.attributes.checkout_data, { email: "a@b.com", discount_code: "10OFF" });
});

/** The raw-JSON escape hatch merges under, never over, the named convenience fields. */
Deno.test("checkout-create: a structured field always wins over the raw JSON escape hatch", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "abc", type: "checkouts" }) }]);
  await checkoutCreate.execute(
    {
      storeId: "1",
      variantId: "2",
      redirectUrl: "https://example.com/thanks",
      productOptionsJson: { redirect_url: "https://attacker.example.com", name: "Custom name" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.product_options.redirect_url, "https://example.com/thanks");
  assertEquals(body.data.attributes.product_options.name, "Custom name");
});

Deno.test("checkout-create: omits empty nested objects entirely rather than sending {}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "abc", type: "checkouts" }) }]);
  await checkoutCreate.execute({ storeId: "1", variantId: "2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("product_options" in body.data.attributes));
  assert(!("checkout_options" in body.data.attributes));
  assert(!("checkout_data" in body.data.attributes));
});
