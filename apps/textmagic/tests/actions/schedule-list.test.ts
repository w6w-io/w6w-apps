import { assertEquals } from "@std/assert";
import scheduleList from "../../actions/schedule-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("schedule-list: GETs /schedules with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 562 }]) }]);
  await scheduleList.execute({ status: "a" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/schedules");
  assertEquals(queryOf(calls[0].url), { status: "a" });
});
