import { assert, assertEquals, assertRejects } from "@std/assert";
import highlightUpdate from "../../actions/highlight-update.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-update: PUTs the parent raindrop with an _id-bearing element", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ highlights: [{ _id: "h1", note: "New" }] }) }]);
  const out = await highlightUpdate.execute(
    { raindropId: 373777232, highlightId: "62388e9e48b63606f41e44a6", note: "New" },
    ctx,
  ) as { highlights: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), {
    highlights: [{ _id: "62388e9e48b63606f41e44a6", note: "New" }],
  });
  assertEquals(out.highlights.length, 1);
});

/**
 * **`text` must never be reachable from this action.** Raindrop deletes a
 * highlight when `text` is the empty string, so an edit form able to write that
 * field could destroy the record by having its box cleared. The parameter list is
 * the guard, and this asserts it directly rather than trusting the doc comment.
 */
Deno.test("highlight-update: exposes no text parameter and never sends one", async () => {
  assertEquals(highlightUpdate.params?.some((p) => p.key === "text"), false);

  const { ctx, calls } = mockCtx([{ body: item({ highlights: [] }) }]);
  await highlightUpdate.execute({ raindropId: 1, highlightId: "h1", note: "", color: "blue" }, ctx);

  const sent = (bodyOf(calls[0]).highlights as Array<Record<string, unknown>>)[0];
  assertEquals("text" in sent, false);
  // An empty NOTE is legitimate and must survive — only an empty TEXT deletes.
  assertEquals(sent, { _id: "h1", color: "blue", note: "" });
});

Deno.test("highlight-update: refuses a request with nothing to change", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(highlightUpdate.execute({ raindropId: 1, highlightId: "h1" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("highlight-update: refuses an empty highlight id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(highlightUpdate.execute({ raindropId: 1, highlightId: " ", note: "x" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("highlight-update: is idempotent and says why text is not editable", () => {
  assertEquals(highlightUpdate.idempotent, true);
  assert(/delete signal/i.test(highlightUpdate.description ?? ""), highlightUpdate.description);
});
