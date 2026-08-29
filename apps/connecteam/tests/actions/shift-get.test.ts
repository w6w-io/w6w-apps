import { assertEquals } from "@std/assert";
import shiftGet from "../../actions/shift-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shift-get: GETs one shift by schedulerId and shiftId", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "sh_1", title: "Morning" }) }]);
  const out = await shiftGet.execute({ schedulerId: 10, shiftId: "sh_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/scheduler/v2/schedulers/10/shifts/sh_1");
  assertEquals(out, { id: "sh_1", title: "Morning" });
});
