import { assertEquals, assertRejects } from "@std/assert";
import tagRename from "../../actions/tag-rename.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

/**
 * **Rename and merge are the same request.** The vendor documents two methods;
 * they are one endpoint and one body, and the only difference is how many
 * strings are in `tags`. A single tag renames it.
 */
Deno.test("tag-rename: one tag is a rename", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await tagRename.execute({ tags: "reading", replace: "to-read" }, ctx) as {
    result: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags");
  assertEquals(calls[0].method, "PUT");
  // The vendor is explicit: "Specify **array** with **only one** string". A bare
  // string here is the mistake this normalisation exists to prevent.
  assertEquals(bodyOf(calls[0]), { tags: ["reading"], replace: "to-read" });
  assertEquals(out.result, true);
});

Deno.test("tag-rename: several tags is a merge, through the identical request", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await tagRename.execute({ tags: "reading, to-read, later", replace: "queue" }, ctx);

  assertEquals(bodyOf(calls[0]), { tags: ["reading", "to-read", "later"], replace: "queue" });
});

Deno.test("tag-rename: a collection scopes the rename to that collection's bookmarks", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await tagRename.execute({ tags: "a", replace: "b", collectionId: 8492393 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags/8492393");
});

Deno.test("tag-rename: refuses an empty tag list or an empty new name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(tagRename.execute({ tags: "", replace: "b" }, ctx)),
    Error,
  );
  await assertRejects(
    () => Promise.resolve(tagRename.execute({ tags: "a", replace: "  " }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("tag-rename: is idempotent", () => {
  assertEquals(tagRename.idempotent, true);
});
