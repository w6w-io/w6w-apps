import { assertEquals, assertRejects } from "@std/assert";
import createStreamMarker from "../../actions/create-stream-marker.ts";
import { helixError, mockCtx, pathOf } from "../_helpers.ts";

/**
 * Unlike Create Clip and Send Chat Announcement, this endpoint takes everything
 * in the BODY — including `user_id`. Putting it in the query is a silent 400.
 */
Deno.test("create-stream-marker: POSTs with user_id in the body, not the query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "123", position_seconds: 244, description: "hi" }] },
  }]);
  const out = await createStreamMarker.execute(
    { userId: "141981764", description: "hi" },
    ctx,
  ) as { data: Array<{ id: string }> };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/helix/streams/markers");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "141981764", description: "hi" });
  assertEquals(out.data[0].id, "123");
});

Deno.test("create-stream-marker: omits an empty description rather than sending one", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "1" }] } }]);
  await createStreamMarker.execute({ userId: "1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "1" });
});

/** "Not live" is the ordinary case for this endpoint, and arrives as a 404. */
Deno.test("create-stream-marker: a 404 explains that the broadcaster is not live", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: helixError("Not Found", 404, "user is not streaming live") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(createStreamMarker.execute({ userId: "1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("not streaming live"), true, err.message);
});

Deno.test("create-stream-marker: is honestly not idempotent", () => {
  assertEquals(createStreamMarker.idempotent, false);
});
