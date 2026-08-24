import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/estimate-create.ts";

Deno.test("estimate-create: POSTs /estimates with customer_id", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", estimate: { estimate_id: "1" } } },
  ]);
  const fields = { customer_id: "460000000123456" };
  await action.execute({ fields }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/estimates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), fields);
});
