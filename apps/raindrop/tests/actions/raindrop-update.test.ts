import { assert, assertEquals } from "@std/assert";
import raindropUpdate from "../../actions/raindrop-update.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("raindrop-update: PUTs the singular path", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 373777232, title: "New" }) }]);
  const out = await raindropUpdate.execute({ raindropId: 373777232, title: "New" }, ctx) as {
    item: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { title: "New" });
  assertEquals(out.item, { _id: 373777232, title: "New" });
});

Deno.test("raindrop-update: omitted fields are absent from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: item({}) }]);
  await raindropUpdate.execute({ raindropId: 1, important: true }, ctx);

  assertEquals(bodyOf(calls[0]), { important: true });
});

/** Moving a bookmark is the same `collection.$id` mapping as on create. */
Deno.test("raindrop-update: collectionId becomes collection.$id", async () => {
  const { ctx, calls } = mockCtx([{ body: item({}) }]);
  await raindropUpdate.execute({ raindropId: 1, collectionId: 8492393 }, ctx);

  assertEquals(bodyOf(calls[0]), { collection: { $id: 8492393 } });
});

/**
 * **The finding this test exists for.** `tags` REPLACES on this path and APPENDS
 * on `PUT /raindrops/{collectionId}` — the same field name, two operations. The
 * hint is the only place a user learns which one they are getting, so it is
 * pinned here alongside the wire shape.
 */
Deno.test("raindrop-update: the tags hint says REPLACES, not adds", () => {
  const hint = raindropUpdate.params?.find((p) => p.key === "tags")?.hint ?? "";
  assert(/REPLACES/.test(hint), hint);
  assert(/does not add/i.test(hint), hint);
  assert(/REPLACES/.test(raindropUpdate.description ?? ""), raindropUpdate.description);
});

Deno.test("raindrop-update: is idempotent", () => {
  assertEquals(raindropUpdate.idempotent, true);
});
