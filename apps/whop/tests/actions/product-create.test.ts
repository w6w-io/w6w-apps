import { assertEquals } from "@std/assert";
import productCreate from "../../actions/product-create.ts";
import { mockCtxWithAccount, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("product-create: POSTs the title and defaults accountId from the connection", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: { id: "prod_1" } }], "biz_conn");
  await productCreate.execute({ title: "Interior Deep Clean" }, ctx);

  assertEquals(pathOf(calls[0].url), "/products");
  assertEquals(JSON.parse(calls[0].body!), {
    account_id: "biz_conn",
    title: "Interior Deep Clean",
  });
});

Deno.test("product-create: sends Idempotency-Key when the runtime gave one", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: { id: "prod_1" } }], "inv-9");
  await productCreate.execute({ title: "x" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-9");
});
