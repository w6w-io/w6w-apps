import { assertEquals, assertRejects } from "@std/assert";
import getGames from "../../actions/get-games.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("get-games: calls GET /helix/games", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "33214", name: "Fortnite" }] } }]);
  const out = await getGames.execute({ id: "33214" }, ctx) as { data: Array<{ name: string }> };

  assertEquals(pathOf(calls[0].url), "/helix/games");
  assertEquals(queryAll(calls[0].url, "id"), ["33214"]);
  assertEquals(out.data[0].name, "Fortnite");
});

/**
 * The reference marks all three "Required?: Yes" but its 400 row says "the id
 * or name or igdb_id" — so at least one, and they combine.
 */
Deno.test("get-games: the three selectors combine rather than excluding each other", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await getGames.execute({ id: "1,2", name: "Fortnite", igdbId: "1905" }, ctx);

  assertEquals(queryAll(calls[0].url, "id"), ["1", "2"]);
  assertEquals(queryAll(calls[0].url, "name"), ["Fortnite"]);
  assertEquals(queryAll(calls[0].url, "igdb_id"), ["1905"]);
});

Deno.test("get-games: refuses a request with no selector at all", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getGames.execute({}, ctx)),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
