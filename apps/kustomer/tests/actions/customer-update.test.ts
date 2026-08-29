import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: PATCHes /customers/{id} with only the set fields", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await action.execute({ id: "1", name: "New Name" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers/1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
  assertEquals(out, { id: "1" });
});

Deno.test("customer-update: is idempotent — a partial attribute merge", () => {
  assertEquals(action.idempotent, true);
});
