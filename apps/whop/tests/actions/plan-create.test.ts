import { assertEquals } from "@std/assert";
import planCreate from "../../actions/plan-create.ts";
import { mockCtxWithAccount, pathOf } from "../_helpers.ts";

Deno.test("plan-create: POSTs plan_type, product_id and pricing", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: { id: "plan_1" } }], "biz_conn");
  await planCreate.execute(
    { productId: "prod_1", planType: "renewal", renewalPrice: 59, billingPeriod: 30 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/plans");
  assertEquals(JSON.parse(calls[0].body!), {
    account_id: "biz_conn",
    product_id: "prod_1",
    plan_type: "renewal",
    renewal_price: 59,
    billing_period: 30,
  });
});
