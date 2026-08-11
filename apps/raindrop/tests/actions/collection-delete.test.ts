import { assert, assertEquals } from "@std/assert";
import collectionDelete from "../../actions/collection-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collection-delete: DELETEs the singular path", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collectionDelete.execute({ id: 8492393 }, ctx) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out.result, true);
});

/**
 * `-99` is Trash, and deleting Trash is Raindrop's Empty Trash operation — it
 * destroys the bookmarks permanently. The action can do it (refusing would mean
 * the app cannot do something the API can), so the hint has to say so.
 */
Deno.test("collection-delete: the id hint warns that -99 empties Trash permanently", () => {
  const hint = collectionDelete.params?.find((p) => p.key === "id")?.hint ?? "";
  assert(/-99/.test(hint), hint);
  assert(/permanent/i.test(hint), hint);
});

/** And that deleting a parent takes its sub-collections with it. */
Deno.test("collection-delete: the description states the cascade and where bookmarks go", () => {
  const description = collectionDelete.description ?? "";
  assert(/sub-collections/i.test(description), description);
  assert(/Trash/.test(description), description);
});

Deno.test("collection-delete: is idempotent", () => {
  assertEquals(collectionDelete.idempotent, true);
});
