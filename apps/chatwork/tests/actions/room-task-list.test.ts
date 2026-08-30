import { assertEquals } from "@std/assert";
import roomTaskList from "../../actions/room-task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-task-list: passes all three filters through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await roomTaskList.execute({
    roomId: "5",
    accountId: 101,
    assignedByAccountId: 78,
    status: "open",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/tasks");
  assertEquals(queryOf(calls[0].url), {
    account_id: "101",
    assigned_by_account_id: "78",
    status: "open",
  });
});

Deno.test("room-task-list: a 204 (no tasks) normalises to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await roomTaskList.execute({ roomId: "5" }, ctx);
  assertEquals(out, []);
});
