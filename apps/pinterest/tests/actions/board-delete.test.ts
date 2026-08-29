import { assert, assertEquals } from "@std/assert";
import boardDelete from "../../actions/board-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-delete: DELETEs /boards/{id} and reports 204 as deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await boardDelete.execute({ boardId: "1" }, ctx) as {
    deleted: boolean;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v5/boards/1");
  assert(out.deleted);
  assertEquals(out.status, 204);
});

Deno.test("board-delete: also treats 200 as deleted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "1" } }]);
  const out = await boardDelete.execute({ boardId: "1" }, ctx) as { deleted: boolean };
  assert(out.deleted);
});
