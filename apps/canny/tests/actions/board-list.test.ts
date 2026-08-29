import { assertEquals } from "@std/assert";
import boardList from "../../actions/board-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("board-list: posts to /v1/boards/list with no body params", async () => {
  const { ctx, calls } = mockCtx([{ body: { boards: [{ id: "b1" }] } }]);
  const out = await boardList.execute({}, ctx) as { boards: unknown[] };

  assertEquals(calls[0].url, "https://canny.io/api/v1/boards/list");
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(out.boards, [{ id: "b1" }]);
});
