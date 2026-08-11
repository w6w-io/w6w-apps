import { assertEquals, assertRejects } from "@std/assert";
import getClips from "../../actions/get-clips.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("get-clips: calls GET /helix/clips", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "AwkwardHelplessSalamander" }], "cur") }]);
  const out = await getClips.execute({ broadcasterId: "1234" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/helix/clips");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "1234" });
  assertEquals(out.data.length, 1);
});

Deno.test("get-clips: the three selectors are mutually exclusive and spend no request", async () => {
  const both = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getClips.execute({ broadcasterId: "1", gameId: "2" }, both.ctx)),
    Error,
    "only one",
  );
  assertEquals(both.calls.length, 0);

  const none = mockCtx([]);
  await assertRejects(() => Promise.resolve(getClips.execute({}, none.ctx)), Error, "exactly one");
  assertEquals(none.calls.length, 0);
});

Deno.test("get-clips: clip IDs repeat their key", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getClips.execute({ id: "foo,bar" }, ctx);
  assertEquals(queryAll(calls[0].url, "id"), ["foo", "bar"]);
});

/**
 * `is_featured` is a genuine tri-state: absent returns everything, `false`
 * returns only unfeatured clips. Dropping `false` would make one of the three
 * inexpressible.
 */
Deno.test("get-clips: is_featured=false is sent explicitly, not dropped", async () => {
  const off = mockCtx([{ body: page([]) }]);
  await getClips.execute({ gameId: "33214", isFeatured: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url).is_featured, "false");

  const unset = mockCtx([{ body: page([]) }]);
  await getClips.execute({ gameId: "33214" }, unset.ctx);
  assertEquals("is_featured" in queryOf(unset.calls[0].url), false);
});

Deno.test("get-clips: the date window is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getClips.execute({
    broadcasterId: "1",
    startedAt: "2026-08-01T00:00:00Z",
    endedAt: "2026-08-08T00:00:00Z",
  }, ctx);
  assertEquals(queryOf(calls[0].url).started_at, "2026-08-01T00:00:00Z");
  assertEquals(queryOf(calls[0].url).ended_at, "2026-08-08T00:00:00Z");
});
