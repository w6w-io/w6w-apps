import { assertEquals } from "@std/assert";
import collectionList from "../../actions/collection-list.ts";
import { items, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("collection-list: reads the plural root path", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ _id: 8492393, title: "Development" }]) }]);
  const out = await collectionList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.items, [{ _id: 8492393, title: "Development" }]);
});

/**
 * The endpoint returns only root collections and never the system ones, so an
 * empty list is not "this account has no bookmarks". The action must hand back
 * exactly what came, without inventing entries.
 */
Deno.test("collection-list: an empty account returns an empty array, not an error", async () => {
  const { ctx } = mockCtx([{ body: items([]) }]);
  assertEquals(await collectionList.execute({}, ctx), { items: [] });
});

Deno.test("collection-list: takes no parameters", () => {
  assertEquals(collectionList.params, []);
  assertEquals(collectionList.type, "read");
});
