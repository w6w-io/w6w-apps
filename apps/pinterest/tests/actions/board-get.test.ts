import { assertEquals } from "@std/assert";
import boardGet from "../../actions/board-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-get: calls GET /boards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42", name: "Recipes", pin_count: 3 } }]);
  const out = await boardGet.execute({ boardId: "42" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v5/boards/42");
  assertEquals(out.name, "Recipes");
});
