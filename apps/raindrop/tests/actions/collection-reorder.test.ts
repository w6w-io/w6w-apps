import { assertEquals } from "@std/assert";
import collectionReorder from "../../actions/collection-reorder.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collection-reorder: PUTs the plural path with a sort value", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collectionReorder.execute({ sort: "-count" }, ctx) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { sort: "-count" });
  assertEquals(out.result, true);
});

/**
 * Three values, exhaustively documented — and NOT the same vocabulary as the
 * raindrop `sort` parameter, which has `-created`, `score` and `domain` forms
 * this endpoint does not accept.
 */
Deno.test("collection-reorder: offers exactly the three documented sort values", () => {
  const options = collectionReorder.params?.find((p) => p.key === "sort")?.options;
  assertEquals((options as Array<{ value: string }>).map((o) => o.value), [
    "title",
    "-title",
    "-count",
  ]);
});

Deno.test("collection-reorder: is idempotent", () => {
  assertEquals(collectionReorder.idempotent, true);
});
