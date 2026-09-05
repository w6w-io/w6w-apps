import { assert, assertEquals } from "@std/assert";
import contactTagsAdd from "../../actions/contact-tags-add.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tags-add: POSTs tags to /contacts/{id}/tags/add", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", tags: "vip,board" }) }]);
  await contactTagsAdd.execute({ id: "1", tags: "vip, board" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1/tags/add");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["vip", "board"] });
});

Deno.test("contact-tags-add: throws before making a request when tags is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await contactTagsAdd.execute({ id: "1", tags: "" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
