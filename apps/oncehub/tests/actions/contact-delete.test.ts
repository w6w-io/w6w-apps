import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CTC-1", deleted: true } }]);
  const result = await action.execute({ id: "CTC-1" }, ctx) as { deleted?: boolean };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/CTC-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.deleted, true);
});
