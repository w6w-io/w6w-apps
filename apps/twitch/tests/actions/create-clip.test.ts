import { assertEquals, assertRejects } from "@std/assert";
import createClip from "../../actions/create-clip.ts";
import { helixError, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * Twitch documents `title` and `duration` as QUERY parameters on this POST, and
 * the request carries no body at all.
 */
Deno.test("create-clip: POSTs with everything in the query and no body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { data: [{ id: "FaintLightGullWhoWouldve", edit_url: "https://clips.twitch.tv/edit" }] },
  }]);
  const out = await createClip.execute(
    { broadcasterId: "44322889", title: "clip it", duration: 15 },
    ctx,
  ) as { data: Array<{ id: string }> };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/helix/clips");
  assertEquals(queryOf(calls[0].url), {
    broadcaster_id: "44322889",
    title: "clip it",
    duration: "15",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.data[0].id, "FaintLightGullWhoWouldve");
});

/** 202 Accepted is the SUCCESS status here, so it must not be treated as an error. */
Deno.test("create-clip: a 202 is a success, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { data: [{ id: "x" }] } }]);
  const out = await createClip.execute({ broadcasterId: "1" }, ctx) as { data: unknown[] };
  assertEquals(out.data.length, 1);
});

/** The broadcaster being offline is the ordinary failure, and it is a 404. */
Deno.test("create-clip: a 404 surfaces Twitch's own explanation", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: helixError("Not Found", 404, "broadcaster must be broadcasting live") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(createClip.execute({ broadcasterId: "1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("broadcasting live"), true, err.message);
});

Deno.test("create-clip: is honestly not idempotent", () => {
  assertEquals(createClip.idempotent, false);
});
