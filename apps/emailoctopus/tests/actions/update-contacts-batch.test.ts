import { assertEquals } from "@std/assert";
import action from "../../actions/update-contacts-batch.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-contacts-batch: PUTs { contacts } to the batch path", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: [], errors: [] } }]);
  await action.execute!({
    listId: "l1",
    contacts: [{ id: "c1", tags: { vip: true } }, { id: "c2", status: "unsubscribed" }],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts/batch");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    contacts: [{ id: "c1", tags: { vip: true } }, { id: "c2", status: "unsubscribed" }],
  });
});

Deno.test("update-contacts-batch: surfaces per-item failures inside a 200", async () => {
  // The trap: HTTP 200 with an `errors` array. A caller checking only the
  // status code silently drops every failed item.
  const { ctx } = mockCtx([{
    body: {
      success: [{ success: true, data: { id: "c1" } }],
      errors: [{
        success: false,
        id: "c2",
        status: 404,
        type: "https://emailoctopus.com/api-documentation/v2#not-found",
        detail: "Resource not found.",
      }],
    },
  }]);
  const out = await action.execute!({ listId: "l1", contacts: [{ id: "c1" }, { id: "c2" }] }, ctx);
  assertEquals(out.errorCount, 1);
  assertEquals(out.success.length, 1);
  assertEquals((out.errors[0] as { id: string }).id, "c2");
});

Deno.test("update-contacts-batch: defaults both arrays when the API omits them", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await action.execute!({ listId: "l1", contacts: [{ id: "c1" }] }, ctx);
  assertEquals(out, { success: [], errors: [], errorCount: 0 });
});
