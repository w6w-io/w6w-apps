import { assertEquals } from "@std/assert";
import scheduleGet from "../../actions/schedule-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("schedule-get: GETs /schedules/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 562, nextSend: "2014-10-13T05:00:00+0000" } }]);
  const out = await scheduleGet.execute({ id: 562 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/schedules/562");
  assertEquals(out, { id: 562, nextSend: "2014-10-13T05:00:00+0000" });
});
