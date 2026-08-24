import { assertEquals } from "@std/assert";
import contactTagAdd from "../../actions/contact-tag-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-add: POSTs {tagId} to /api/contacts/{id}/tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactTagAdd.execute({ id: "1", tagId: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contacts/1/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { tagId: 7 });
  assertEquals(out, { status: 204 });
});
