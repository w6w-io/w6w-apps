import { assert, assertEquals, assertRejects } from "@std/assert";
import collectionDeleteMany from "../../actions/collection-delete-many.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

/** Plural path, ids in the BODY — not the query string. */
Deno.test("collection-delete-many: DELETEs the plural path with ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collectionDeleteMany.execute({ ids: "8492393, 8364483" }, ctx) as {
    result: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(bodyOf(calls[0]), { ids: [8492393, 8364483] });
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.result, true);
});

Deno.test("collection-delete-many: accepts an array as well as a comma-joined string", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await collectionDeleteMany.execute({ ids: [1, 2] }, ctx);
  assertEquals(bodyOf(calls[0]), { ids: [1, 2] });
});

/** An empty selection must not become "delete nothing, silently". */
Deno.test("collection-delete-many: refuses an empty id list without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(collectionDeleteMany.execute({ ids: "" }, ctx)), Error);
  assertEquals(calls.length, 0);
});

/**
 * The difference from the singular delete is the entire reason this endpoint
 * exists: it does NOT cascade. A caller expecting the other behaviour is left
 * with orphaned sub-collections.
 */
Deno.test("collection-delete-many: says that sub-collections are NOT removed", () => {
  const text = `${collectionDeleteMany.description} ${
    collectionDeleteMany.params?.find((p) => p.key === "ids")?.hint
  }`;
  assert(/not.*(removed|cascade)/i.test(text), text);
});
