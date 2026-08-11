import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { items, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-list: no collection reads the account-wide path", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ _id: "api", count: 100 }]) }]);
  const out = await tagList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags");
  // A tag's NAME is its `_id` — tags have no numeric identity in this API.
  assertEquals(out.items, [{ _id: "api", count: 100 }]);
});

Deno.test("tag-list: a collection id becomes a path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await tagList.execute({ collectionId: 8492393 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags/8492393");
});

/** Collection 0 is a collection, not an absence — see highlight-list for why. */
Deno.test("tag-list: collection 0 reaches the path", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await tagList.execute({ collectionId: 0 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/tags/0");
});
