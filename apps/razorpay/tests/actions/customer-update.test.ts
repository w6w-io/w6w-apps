import { assertEquals } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust_1", email: "new@example.com" } }]);
  await customerUpdate.execute({ id: "cust_1", email: "new@example.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/customers/cust_1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { email: "new@example.com" });
});
