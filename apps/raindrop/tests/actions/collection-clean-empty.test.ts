import { assertEquals } from "@std/assert";
import collectionCleanEmpty from "../../actions/collection-clean-empty.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collection-clean-empty: PUTs /collections/clean and reports the count", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ count: 3 }) }]);
  const out = await collectionCleanEmpty.execute({}, ctx) as { count: number; result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/clean");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
  assertEquals(out, { count: 3, result: true });
});

/**
 * The count is the only report this endpoint makes — it never names what it
 * removed — so a missing `count` must read as zero rather than `undefined`.
 */
Deno.test("collection-clean-empty: a response without a count reports zero", async () => {
  const { ctx } = mockCtx([{ body: okBody() }]);
  assertEquals(await collectionCleanEmpty.execute({}, ctx), { count: 0, result: true });
});

Deno.test("collection-clean-empty: is idempotent and takes no parameters", () => {
  assertEquals(collectionCleanEmpty.idempotent, true);
  assertEquals(collectionCleanEmpty.params, []);
});
