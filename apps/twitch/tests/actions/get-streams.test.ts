import { assertEquals } from "@std/assert";
import getStreams from "../../actions/get-streams.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("get-streams: calls GET /helix/streams", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "1", user_login: "afro" }], "cur") }]);
  const out = await getStreams.execute({ userLogin: "afro" }, ctx) as {
    pagination: { cursor: string };
  };

  assertEquals(pathOf(calls[0].url), "/helix/streams");
  assertEquals(queryAll(calls[0].url, "user_login"), ["afro"]);
  assertEquals(out.pagination.cursor, "cur");
});

Deno.test("get-streams: every multi-valued filter repeats its key", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getStreams.execute({
    userLogin: "afro,cohhcarnage",
    userId: ["1", "2"],
    gameId: "9876 5432",
    language: "en,de",
  }, ctx);

  assertEquals(queryAll(calls[0].url, "user_login"), ["afro", "cohhcarnage"]);
  assertEquals(queryAll(calls[0].url, "user_id"), ["1", "2"]);
  assertEquals(queryAll(calls[0].url, "game_id"), ["9876", "5432"]);
  assertEquals(queryAll(calls[0].url, "language"), ["en", "de"]);
});

/** An offline broadcaster is simply absent — an empty list is a valid answer. */
Deno.test("get-streams: an empty list for a real login is passed through, not treated as an error", async () => {
  const { ctx } = mockCtx([{ body: page([]) }]);
  const out = await getStreams.execute({ userLogin: "twitchdev" }, ctx) as { data: unknown[] };
  assertEquals(out.data, []);
});

Deno.test("get-streams: paging parameters are forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getStreams.execute({ type: "live", first: 100, after: "a", before: "b" }, ctx);
  assertEquals(queryOf(calls[0].url), { type: "live", first: "100", after: "a", before: "b" });
});
