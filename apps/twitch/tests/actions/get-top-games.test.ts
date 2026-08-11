import { assertEquals } from "@std/assert";
import getTopGames from "../../actions/get-top-games.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-top-games: calls GET /helix/games/top with no required parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "493057", name: "PUBG" }], "cur") }]);
  const out = await getTopGames.execute({}, ctx) as { pagination: { cursor: string } };

  assertEquals(pathOf(calls[0].url), "/helix/games/top");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.pagination.cursor, "cur");
});

Deno.test("get-top-games: forwards both cursors", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getTopGames.execute({ first: 10, after: "a", before: "b" }, ctx);
  assertEquals(queryOf(calls[0].url), { first: "10", after: "a", before: "b" });
});
