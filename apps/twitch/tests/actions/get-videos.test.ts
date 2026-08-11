import { assertEquals, assertRejects } from "@std/assert";
import getVideos from "../../actions/get-videos.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("get-videos: calls GET /helix/videos", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "335921245" }]) }]);
  await getVideos.execute({ id: "335921245" }, ctx);

  assertEquals(pathOf(calls[0].url), "/helix/videos");
  assertEquals(queryAll(calls[0].url, "id"), ["335921245"]);
});

Deno.test("get-videos: the three selectors are mutually exclusive and spend no request", async () => {
  const both = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getVideos.execute({ id: "1", userId: "2" }, both.ctx)),
    Error,
    "only one",
  );
  assertEquals(both.calls.length, 0);

  const none = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getVideos.execute({}, none.ctx)),
    Error,
    "exactly one",
  );
  assertEquals(none.calls.length, 0);
});

/**
 * Twitch documents the filters as valid "only if you specify the game_id or
 * user_id query parameter", so sending them alongside `id` would be guessing.
 */
Deno.test("get-videos: filters are dropped for an ID lookup and kept for a broadcaster lookup", async () => {
  const byId = mockCtx([{ body: page([]) }]);
  await getVideos.execute({ id: "1", period: "week", sort: "views", first: 5 }, byId.ctx);
  assertEquals(queryOf(byId.calls[0].url), { id: "1" });

  const byUser = mockCtx([{ body: page([]) }]);
  await getVideos.execute({ userId: "2", period: "week", sort: "views", first: 5 }, byUser.ctx);
  assertEquals(queryOf(byUser.calls[0].url), {
    user_id: "2",
    period: "week",
    sort: "views",
    first: "5",
  });
});

/** `after`/`before` are documented for the user_id form only. */
Deno.test("get-videos: cursors are sent only for a broadcaster lookup", async () => {
  const byGame = mockCtx([{ body: page([]) }]);
  await getVideos.execute({ gameId: "33214", after: "cur" }, byGame.ctx);
  assertEquals(queryOf(byGame.calls[0].url), { game_id: "33214" });

  const byUser = mockCtx([{ body: page([]) }]);
  await getVideos.execute({ userId: "2", after: "cur" }, byUser.ctx);
  assertEquals(queryOf(byUser.calls[0].url).after, "cur");
});
