import { assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-create: posts the body with snake_case fields and the override flag as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cu_0Th3r", customer_id: "USER789" } }]);
  const out = await customerCreate.execute(
    {
      customerId: "USER789",
      coupon: "JANE10OFF",
      metaData: { tim: "tam" },
      overrideMaxCookieTime: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/customers/");
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0].url), { override_max_cookie_time: "true" });
  assertEquals(
    JSON.parse(calls[0].body!),
    { customer_id: "USER789", coupon: "JANE10OFF", meta_data: { tim: "tam" } },
  );
  assertEquals(out, { id: "cu_0Th3r", customer_id: "USER789" });
});

Deno.test("customer-create: omits unset optional fields entirely rather than sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerCreate.execute({ customerId: "USER1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { customer_id: "USER1" });
});
