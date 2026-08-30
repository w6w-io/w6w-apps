import { assertEquals } from "@std/assert";
import contactTagSet from "../../actions/contact-tag-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test('contact-tag-set: add sends {action: "add"} to the shared tag-attach path', async () => {
  const { ctx, calls } = mockCtx([{ body: [{ tag_id: "t1", title: "My tag" }] }]);
  const out = await contactTagSet.execute(
    { contactId: "c1", tagId: "t1", action: "add" },
    ctx,
  ) as { tags: unknown[] };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/contacts/c1/tags/t1");
  assertEquals(JSON.parse(calls[0].body!), { action: "add" });
  assertEquals(out.tags.length, 1);
});

Deno.test("contact-tag-set: remove uses the identical path, only the body differs", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await contactTagSet.execute(
    { contactId: "c1", tagId: "t1", action: "remove" },
    ctx,
  ) as { tags: unknown[] };
  assertEquals(pathOf(calls[0].url), "/contacts/c1/tags/t1");
  assertEquals(JSON.parse(calls[0].body!), { action: "remove" });
  assertEquals(out.tags, []);
});
