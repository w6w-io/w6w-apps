import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-list.ts";

Deno.test("contacts-list: POSTs a filter body with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { list: [], total: 0 } } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contacts/get-list");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), { limit: 100, offset: 0 });
});

Deno.test("contacts-list: returns the `data.list`/`data.total` envelope untouched", async () => {
  const { ctx } = mockCtx([{ body: { data: { list: [{ id: 1 }], total: 1 } } }]);
  const result = await action.execute!({ email: "a@b.com" }, ctx);
  assertEquals(result, { data: { list: [{ id: 1 }], total: 1 } });
});
