import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-delete.ts";

Deno.test("contacts-delete: POSTs contacts.delete with {id} and confirms deletion", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ id: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts.delete");
  assertEquals(JSON.parse(calls[0].body!), { id: "1" });
  assertEquals(out, { id: "1", deleted: true });
});
