import { assertEquals } from "@std/assert";
import clockOut from "../../actions/clock-out.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("clock-out: POSTs to the time clock's clock-out path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shift: { id: "sh_1" } }) }]);
  const out = await clockOut.execute({ timeClockId: 99, userId: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/99/clock-out");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { userId: 7 });
  assertEquals(out, { shift: { id: "sh_1" } });
});

Deno.test("clock-out: not idempotent — a retry has no open shift left to close", () => {
  assertEquals(clockOut.idempotent, false);
});
