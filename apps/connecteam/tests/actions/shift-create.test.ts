import { assertEquals, assertRejects } from "@std/assert";
import shiftCreate from "../../actions/shift-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shift-create: POSTs a one-element array to the v2 shifts path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shifts: [{ id: "sh_1" }] }) }]);
  await shiftCreate.execute(
    { schedulerId: 10, startTime: 1, endTime: 2, title: "Morning" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/scheduler/v2/schedulers/10/shifts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [{ startTime: 1, endTime: 2, title: "Morning" }]);
});

Deno.test("shift-create: notifyUsers is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shifts: [] }) }]);
  await shiftCreate.execute(
    { schedulerId: 10, startTime: 1, endTime: 2, title: "x", notifyUsers: false },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("notifyUsers"), "false");
});

Deno.test("shift-create: refuses a shift with neither title nor jobId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await shiftCreate.execute({ schedulerId: 10, startTime: 1, endTime: 2 }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("shift-create: a jobId alone (no title) is accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shifts: [] }) }]);
  await shiftCreate.execute({ schedulerId: 10, startTime: 1, endTime: 2, jobId: "job_1" }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("shift-create: not idempotent", () => {
  assertEquals(shiftCreate.idempotent, false);
});
