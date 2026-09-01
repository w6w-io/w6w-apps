import { assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: posts name/email to /customers", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "cst_1", name: "Ada" } }]);
  const out = await customerCreate.execute({ name: "Ada", email: "ada@example.org" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada", email: "ada@example.org" });
  assertEquals(out, { id: "cst_1", name: "Ada" });
});

Deno.test("customer-create: is not idempotent", () => {
  assertEquals(customerCreate.idempotent, false);
});
