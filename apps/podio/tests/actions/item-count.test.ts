import { assertEquals, assertRejects } from "@std/assert";
import itemCount from "../../actions/item-count.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-count: GETs the count endpoint and unwraps the number", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 4218 } }]);
  assertEquals(await itemCount.execute({ appId: "123" }, ctx), { count: 4218 });
  assertEquals(pathOf(calls[0].url), "/item/app/123/count");
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * This endpoint's filters are ad-hoc query keys, one per field id, with the
 * value already formatted — a different grammar from Filter Items' JSON body.
 * Podio's own example: `/item/app/123/?876=null;active`.
 */
Deno.test("item-count: filters become query keys, exactly as Podio documents", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 7 } }]);
  await itemCount.execute({
    appId: "123",
    viewId: "42",
    filters: { "876": "null;active", created_on: "2026-01-01-2026-12-31" },
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    "876": "null;active",
    created_on: "2026-01-01-2026-12-31",
    view_id: "42",
  });
});

Deno.test("item-count: filters may arrive as a typed JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 1 } }]);
  await itemCount.execute({ appId: "1", filters: '{"876":"active"}' }, ctx);
  assertEquals(queryOf(calls[0].url), { "876": "active" });
});

Deno.test("item-count: unparseable filters fail before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(itemCount.execute({ appId: "1", filters: "{bad" }, ctx)),
    Error,
    "Filters is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-count: a missing count reads as zero, not undefined", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await itemCount.execute({ appId: "1" }, ctx), { count: 0 });
});
