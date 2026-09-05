import { assertEquals } from "@std/assert";
import contactTagsRemove from "../../actions/contact-tags-remove.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tags-remove: POSTs tags to /contacts/{id}/tags/remove", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactTagsRemove.execute({ id: "1", tags: "vip" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1/tags/remove");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["vip"] });
});
