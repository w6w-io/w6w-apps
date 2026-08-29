import { assertEquals } from "@std/assert";
import numberPurchase from "../../actions/number-purchase.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("number-purchase: posts to /numbers/purchase (outside /v1) with area_code/country_code", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { phone_number: "+14155551234" } }]);
  const out = await numberPurchase.execute({ areaCode: "415", countryCode: "US" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/numbers/purchase");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { area_code: "415", country_code: "US" });
  assertEquals((out.result as { phone_number: string }).phone_number, "+14155551234");
});

Deno.test("number-purchase: an exact phone_number overrides area_code", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await numberPurchase.execute(
    { areaCode: "415", countryCode: "US", phoneNumber: "+12223334444" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.phone_number, "+12223334444");
  assertEquals("area_code" in body, false);
});

Deno.test("number-purchase: is declared not idempotent", () => {
  assertEquals(numberPurchase.idempotent, false);
});
