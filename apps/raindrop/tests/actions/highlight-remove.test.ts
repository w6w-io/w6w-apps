import { assertEquals, assertRejects } from "@std/assert";
import highlightRemove from "../../actions/highlight-remove.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

/**
 * **There is no DELETE for a highlight.** Removal is a PUT on the parent
 * raindrop whose array element carries the highlight's `_id` and an empty
 * `text`. Nothing about the request says "delete", which is the whole reason
 * this is its own action — and this test pins the exact encoding.
 */
Deno.test('highlight-remove: PUTs {_id, text: ""} — the vendor\'s delete encoding', async () => {
  const { ctx, calls } = mockCtx([{ body: item({ highlights: [] }) }]);
  const out = await highlightRemove.execute(
    { raindropId: 373777232, highlightId: "62388e9e48b63606f41e44a6" },
    ctx,
  ) as { highlights: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), {
    highlights: [{ _id: "62388e9e48b63606f41e44a6", text: "" }],
  });
  assertEquals(out.highlights, []);
});

/**
 * The empty string is a literal in the action, not a pass-through of anything
 * the caller supplied — so this action can only ever delete the one highlight it
 * was given, and can never be steered into writing text.
 */
Deno.test("highlight-remove: exposes no text parameter to steer the delete", () => {
  assertEquals(highlightRemove.params?.some((p) => p.key === "text"), false);
  assertEquals(highlightRemove.params?.map((p) => p.key), ["raindropId", "highlightId"]);
});

Deno.test("highlight-remove: refuses an empty highlight id without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(highlightRemove.execute({ raindropId: 1, highlightId: "" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("highlight-remove: is idempotent", () => {
  assertEquals(highlightRemove.idempotent, true);
});
