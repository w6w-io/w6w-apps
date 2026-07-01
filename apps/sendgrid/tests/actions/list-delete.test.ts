import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-delete.ts";

Deno.test("list-delete: DELETE /marketing/lists/{id}?delete_contacts=false", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ listId: "list-1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/lists/list-1?delete_contacts=false",
  );
  assertEquals(result, { success: true });
});

Deno.test("list-delete: deleteContacts=true flips the flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ listId: "list-1", deleteContacts: true }, ctx);

  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/lists/list-1?delete_contacts=true",
  );
});

Deno.test("list-delete: missing listId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listId: "" }, ctx),
    Error,
    "`listId`",
  );
});
