import { assertEquals } from "@std/assert";
import taskboardList from "../../actions/taskboard-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("taskboard-list: GETs /tasks/v1/taskboards with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ taskBoards: [{ id: "tb_1" }] }) }]);
  const out = await taskboardList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/tasks/v1/taskboards");
  assertEquals(out, { taskBoards: [{ id: "tb_1" }] });
});
