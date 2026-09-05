import { assertEquals } from "@std/assert";
import conversionCreate from "../../actions/conversion-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-create: posts snake_case fields and the override flag as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, amount: 100 } }]);
  const out = await conversionCreate.execute(
    {
      coupon: "JANE10OFF",
      externalId: "ORD005",
      amount: 100,
      currency: "EUR",
      metaData: { foo: "bar" },
      programGroup: "my-group",
      overrideMaxCookieTime: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/");
  assertEquals(queryOf(calls[0].url), { override_max_cookie_time: "true" });
  assertEquals(JSON.parse(calls[0].body!), {
    coupon: "JANE10OFF",
    external_id: "ORD005",
    amount: 100,
    currency: "EUR",
    meta_data: { foo: "bar" },
    program_group: "my-group",
  });
  assertEquals(out, { id: 2, amount: 100 });
});
