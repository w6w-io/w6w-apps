import { assert, assertEquals, assertRejects } from "@std/assert";
import highlightAdd from "../../actions/highlight-add.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

/**
 * Highlights have no write endpoints of their own: adding one is a PUT on the
 * PARENT raindrop carrying a one-element `highlights` array.
 */
Deno.test("highlight-add: PUTs the parent raindrop with a highlights array", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1, highlights: [{ _id: "h1" }] }) }]);
  const out = await highlightAdd.execute(
    { raindropId: 373777232, text: "Orion is a WebKit browser", color: "red", note: "native" },
    ctx,
  ) as { highlights: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), {
    highlights: [{ text: "Orion is a WebKit browser", color: "red", note: "native" }],
  });
  assertEquals(out.highlights, [{ _id: "h1" }]);
});

/** No `_id`: an element without one is what makes this an add rather than an edit. */
Deno.test("highlight-add: sends no _id, which is what distinguishes add from update", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ highlights: [] }) }]);
  await highlightAdd.execute({ raindropId: 1, text: "quote" }, ctx);

  const sent = (bodyOf(calls[0]).highlights as Array<Record<string, unknown>>)[0];
  assertEquals("_id" in sent, false);
  assertEquals(sent, { text: "quote" });
});

/**
 * **An empty `text` is Raindrop's DELETE instruction.** Letting one through this
 * action would silently destroy a highlight from a form labelled "add", so it is
 * refused before the request.
 */
Deno.test("highlight-add: refuses empty text, because empty text means delete", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(highlightAdd.execute({ raindropId: 1, text: "   " }, ctx)),
    Error,
  );
  assert(/delete/i.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** A retry adds a second identical highlight. */
Deno.test("highlight-add: is not idempotent", () => {
  assertEquals(highlightAdd.idempotent, false);
});
