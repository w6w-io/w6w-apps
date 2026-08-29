import { assertEquals } from "@std/assert";
import timeClockList from "../../actions/time-clock-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-clock-list: GETs /time-clock/v1/time-clocks with no params", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ timeClocks: [{ id: 1, name: "Main", isArchived: false }] }) },
  ]);
  const out = await timeClockList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks");
  assertEquals(out, { timeClocks: [{ id: 1, name: "Main", isArchived: false }] });
});

Deno.test("time-clock-list: takes no parameters", () => {
  assertEquals(timeClockList.params?.length, 0);
});
