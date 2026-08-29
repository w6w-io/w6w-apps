import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-list.ts";

Deno.test("customer-list: GETs /customers with pagination and preserves the envelope", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [{ id: "1" }], meta: { page: 2 } } }]);
  const out = await action.execute({ page: 2, pageSize: 50, sort: "-updatedAt" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/customers?page=2&pageSize=50&sort=-updatedAt",
  );
  assertEquals(out, { data: [{ id: "1" }], meta: { page: 2 } });
});

Deno.test("customer-list: omits unset query params", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers");
});
