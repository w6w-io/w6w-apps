import { assertEquals } from "@std/assert";
import scheduleDelete from "../../actions/schedule-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("schedule-delete: DELETEs /schedules/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await scheduleDelete.execute({ id: 562 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/schedules/562");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
