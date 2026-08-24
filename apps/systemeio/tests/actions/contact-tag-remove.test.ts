import { assertEquals } from "@std/assert";
import contactTagRemove from "../../actions/contact-tag-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-remove: DELETEs /api/contacts/{id}/tags/{tagId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactTagRemove.execute({ id: 1, tagId: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contacts/1/tags/7");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
