import { assertEquals } from "@std/assert";
import action from "../../actions/delete-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-contact: DELETEs the contact path and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ listId: "l1", contactId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts/c1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

Deno.test("delete-contact: accepts an email MD5 in place of the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ listId: "l1", contactId: "631251b876fece73bc9dd647fe596d5f" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/lists/l1/contacts/631251b876fece73bc9dd647fe596d5f",
  );
});
