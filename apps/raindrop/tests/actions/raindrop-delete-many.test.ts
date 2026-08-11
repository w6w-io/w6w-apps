import { assert, assertEquals, assertRejects } from "@std/assert";
import raindropDeleteMany from "../../actions/raindrop-delete-many.ts";
import { bodyOf, mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("raindrop-delete-many: DELETEs the plural path with ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ modified: 330 }) }]);
  const out = await raindropDeleteMany.execute({ collectionId: 8492393, ids: "1, 2" }, ctx) as {
    modified: number;
    result: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/8492393");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(bodyOf(calls[0]), { ids: [1, 2] });
  assertEquals(out, { modified: 330, result: true });
});

/** Same vendor warning as the batch update: 0 is not supported here. */
Deno.test("raindrop-delete-many: refuses collection 0 without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(raindropDeleteMany.execute({ collectionId: 0 }, ctx)),
    Error,
  );
  assert(err.message.includes("does not support collection 0"), err.message);
  assertEquals(calls.length, 0);
});

/**
 * `-99` IS allowed, and it destroys permanently. The action must not block it —
 * that is a real operation the API offers — but it must be reachable only by
 * typing the id, and the hint must say what happens.
 */
Deno.test("raindrop-delete-many: -99 is allowed and the hint says it is permanent", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await raindropDeleteMany.execute({ collectionId: -99 }, ctx);
  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/-99");

  const hint = raindropDeleteMany.params?.find((p) => p.key === "collectionId")?.hint ?? "";
  assert(/-99/.test(hint) && /permanent/i.test(hint), hint);
});

/** `search` is a query parameter and `ids` a body field — the vendor's asymmetry. */
Deno.test("raindrop-delete-many: search goes in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await raindropDeleteMany.execute({ collectionId: 1, search: "type:image", nested: true }, ctx);

  assertEquals(queryOf(calls[0].url), { search: "type:image", nested: "true" });
  assertEquals(calls[0].body, null);
});

Deno.test("raindrop-delete-many: the ids hint warns that empty means the whole collection", () => {
  const hint = raindropDeleteMany.params?.find((p) => p.key === "ids")?.hint ?? "";
  assert(/WHOLE COLLECTION/i.test(hint), hint);
});

Deno.test("raindrop-delete-many: is idempotent", () => {
  assertEquals(raindropDeleteMany.idempotent, true);
});
