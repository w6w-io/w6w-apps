import { assert, assertEquals, assertRejects } from "@std/assert";
import tagRemove from "../../actions/tag-remove.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

/** The tag list goes in the BODY of a DELETE, not the query string. */
Deno.test("tag-remove: DELETEs /tags with the tags in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await tagRemove.execute({ tags: "obsolete, draft" }, ctx) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(bodyOf(calls[0]), { tags: ["obsolete", "draft"] });
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.result, true);
});

Deno.test("tag-remove: a collection scopes the removal", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await tagRemove.execute({ tags: "draft", collectionId: 8492393 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags/8492393");
});

/**
 * Scoped removal does not make the tag disappear from List Tags — the bookmarks
 * elsewhere keep it. Stated in the hint because the opposite is the natural
 * assumption.
 */
Deno.test("tag-remove: the collection hint says the tag survives elsewhere", () => {
  const hint = tagRemove.params?.find((p) => p.key === "collectionId")?.hint ?? "";
  assert(/survives elsewhere/i.test(hint), hint);
});

Deno.test("tag-remove: refuses an empty tag list without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(tagRemove.execute({ tags: "" }, ctx)), Error);
  assertEquals(calls.length, 0);
});
