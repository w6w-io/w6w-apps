import { assertEquals } from "@std/assert";
import collectionChildrenList from "../../actions/collection-children-list.ts";
import { items, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor's spelling is `childrens`. "Correcting" it is a silent 404, and an
 * unauthenticated probe cannot tell you so — the API answers the same 401 for
 * every path, real or not.
 */
Deno.test("collection-children-list: uses the vendor's `childrens` spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ _id: 1, parent: { $id: 8492393 } }]) }]);
  const out = await collectionChildrenList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/childrens");
  assertEquals(out.items.length, 1);
});

Deno.test("collection-children-list: an account with no nesting returns an empty array", async () => {
  const { ctx } = mockCtx([{ body: items([]) }]);
  assertEquals(await collectionChildrenList.execute({}, ctx), { items: [] });
});
