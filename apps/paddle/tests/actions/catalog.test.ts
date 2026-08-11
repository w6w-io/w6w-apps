import { assert, assertEquals, assertRejects } from "@std/assert";
import productList from "../../actions/product-list.ts";
import productGet from "../../actions/product-get.ts";
import productCreate from "../../actions/product-create.ts";
import productUpdate from "../../actions/product-update.ts";
import priceList from "../../actions/price-list.ts";
import priceGet from "../../actions/price-get.ts";
import priceCreate from "../../actions/price-create.ts";
import { envelope, errorBody, mockPaddleCtx } from "../_helpers.ts";

Deno.test("product-list: maps every filter onto Paddle's parameter names", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await productList.execute({
    ids: "pro_1,pro_2",
    status: ["active", "archived"],
    taxCategory: "saas",
    type: "standard",
    includePrices: true,
    orderBy: "name[ASC]",
    perPage: 200,
    after: "pro_2",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/products");
  assertEquals(url.searchParams.get("id"), "pro_1,pro_2");
  assertEquals(url.searchParams.get("status"), "active,archived");
  assertEquals(url.searchParams.get("tax_category"), "saas");
  assertEquals(url.searchParams.get("type"), "standard");
  assertEquals(url.searchParams.get("include"), "prices");
  assertEquals(url.searchParams.get("order_by"), "name[ASC]");
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(url.searchParams.get("after"), "pro_2");
});

/**
 * `includePrices: false` must not send `include=`. Paddle validates the value
 * of `include` against an enum, and an empty one is a 400.
 */
Deno.test("product-list: omits include entirely when prices are not wanted", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await productList.execute({ includePrices: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include"), null);
});

Deno.test("product-list: returns the envelope so the pagination cursor survives", async () => {
  const { ctx } = mockPaddleCtx([
    {
      body: envelope([{ id: "pro_1" }], {
        has_more: true,
        next: "https://api.paddle.com/products?after=pro_1",
      }),
    },
  ]);
  const out = await productList.execute({}, ctx) as { meta?: { pagination?: { next?: string } } };
  assert(out.meta?.pagination?.next?.includes("after=pro_1"));
});

Deno.test("product-get: path-encodes the id and only sends include when asked", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }, { body: envelope({}) }]);
  await productGet.execute({ productId: "pro_01gsz4t5hdjse780zja8vvr7jg" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/products/pro_01gsz4t5hdjse780zja8vvr7jg");
  assertEquals(new URL(calls[0].url).searchParams.get("include"), null);
  await productGet.execute(
    { productId: "pro_01gsz4t5hdjse780zja8vvr7jg", includePrices: true },
    ctx,
  );
  assertEquals(new URL(calls[1].url).searchParams.get("include"), "prices");
});

Deno.test("product-create: posts the documented body and drops what was left blank", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({ id: "pro_1" }) }]);
  await productCreate.execute({
    name: "AeroEdit Student",
    taxCategory: "standard",
    description: "",
    customData: '{"tier":"student"}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "AeroEdit Student",
    tax_category: "standard",
    custom_data: { tier: "student" },
  });
});

Deno.test("product-create: is honestly not idempotent", () => {
  assertEquals(productCreate.idempotent, false);
});

/**
 * A PATCH applies exactly the keys it receives, so an untouched field must not
 * appear in the body — sending it would overwrite a real value with a blank.
 */
Deno.test("product-update: sends only the fields the caller filled in", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await productUpdate.execute({ productId: "pro_1", status: "archived" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "archived" });
});

Deno.test("price-list: maps the dotted billing-cycle filter through unchanged", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await priceList.execute(
    { productId: "pro_1", recurring: true, billingCycleInterval: "month" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("product_id"), "pro_1");
  assertEquals(url.searchParams.get("recurring"), "true");
  assertEquals(url.searchParams.get("billing_cycle.interval"), "month");
});

Deno.test("price-get: builds the price path", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await priceGet.execute({ priceId: "pri_01gsz8x8sawmvhz1pv30nge1ke", includeProduct: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/prices/pri_01gsz8x8sawmvhz1pv30nge1ke");
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "product");
});

/**
 * The amount is a STRING in the lowest denomination. If this ever starts
 * sending a number, or a decimal, every price created through the app is wrong
 * by two orders of magnitude.
 */
Deno.test("price-create: sends unit_price as an integer string in the lowest denomination", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({ id: "pri_1" }) }]);
  await priceCreate.execute({
    productId: "pro_1",
    description: "Monthly",
    amount: "1000",
    currencyCode: "USD",
    billingCycleInterval: "month",
    billingCycleFrequency: 1,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.unit_price, { amount: "1000", currency_code: "USD" });
  assertEquals(typeof body.unit_price.amount, "string");
  assertEquals(body.billing_cycle, { interval: "month", frequency: 1 });
});

/** No billing cycle means a one-time price — the key must be absent, not null. */
Deno.test("price-create: omits billing_cycle entirely for a one-time price", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({}) }]);
  await priceCreate.execute({
    productId: "pro_1",
    description: "One-off",
    amount: "2500",
    currencyCode: "USD",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("billing_cycle" in body), JSON.stringify(body));
  assert(!("trial_period" in body), JSON.stringify(body));
  assert(!("quantity" in body), JSON.stringify(body));
});

/**
 * Half a billing cycle is not a billing cycle: Paddle requires both `interval`
 * and `frequency`, so sending one alone would 400.
 */
Deno.test("price-create: ignores a half-specified billing cycle rather than sending it", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({}) }]);
  await priceCreate.execute({
    productId: "pro_1",
    description: "Half",
    amount: "100",
    currencyCode: "USD",
    billingCycleInterval: "month",
  }, ctx);
  assert(!("billing_cycle" in JSON.parse(calls[0].body!)));
});

Deno.test("price-create: sends a partial quantity object when only one bound is given", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({}) }]);
  await priceCreate.execute({
    productId: "pro_1",
    description: "Seats",
    amount: "100",
    currencyCode: "USD",
    quantityMinimum: 5,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).quantity, { minimum: 5 });
});

Deno.test("catalog: a validation failure surfaces the offending field", async () => {
  const { ctx } = mockPaddleCtx([
    {
      status: 400,
      body: errorBody("invalid_field", "Request does not pass validation.", [
        { field: "tax_category", message: "must be enabled on your account" },
      ]),
    },
  ]);
  await assertRejects(
    async () => {
      await productCreate.execute({ name: "x", taxCategory: "ebooks" }, ctx);
    },
    Error,
    "tax_category: must be enabled on your account",
  );
});
