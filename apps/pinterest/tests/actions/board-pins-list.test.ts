import { assertEquals } from "@std/assert";
import boardPinsList from "../../actions/board-pins-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-pins-list: calls GET /boards/{id}/pins", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "p1" }], bookmark: null } }]);
  const out = await boardPinsList.execute({ boardId: "7" }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v5/boards/7/pins");
  assertEquals(out.items.length, 1);
});
