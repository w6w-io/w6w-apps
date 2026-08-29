import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/kobject-create.ts";

Deno.test("kobject-create: POSTs /klasses/{name} with title as the only required field", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "k1" } } }]);
  const out = await action.execute({ name: "order", title: "Order #123" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/klasses/order");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "Order #123" });
  assertEquals(out, { id: "k1" });
});

Deno.test("kobject-create: parses the data JSON param", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute({ name: "order", title: "x", data: { sku: "ABC" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data, { sku: "ABC" });
});
