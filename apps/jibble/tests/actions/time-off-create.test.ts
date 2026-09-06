import { assertEquals, assertRejects } from "@std/assert";
import timeOffCreate from "../../actions/time-off-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-off-create: a FullDay request sends startDate/endDate, not startTime/endTime", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "to1" } }]);
  await timeOffCreate.execute({
    personId: "p1",
    policyId: "pol1",
    kind: "FullDay",
    startDate: "2024-02-11",
    endDate: "2024-02-16",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/TimeOffIntervals");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.startDate, "2024-02-11");
  assertEquals(body.endDate, "2024-02-16");
  assertEquals("startTime" in body, false);
});

Deno.test("time-off-create: an Hours request sends startTime/endTime, not startDate/endDate", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "to2" } }]);
  await timeOffCreate.execute({
    personId: "p1",
    policyId: "pol1",
    kind: "Hours",
    startTime: "2024-01-29T09:00:00Z",
    endTime: "2024-01-29T13:00:00Z",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.startTime, "2024-01-29T09:00:00Z");
  assertEquals("startDate" in body, false);
});

Deno.test("time-off-create: refuses a FullDay request missing startDate/endDate", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        timeOffCreate.execute({ personId: "p1", policyId: "pol1", kind: "FullDay" }, ctx),
      ),
    Error,
    "startDate",
  );
});

Deno.test("time-off-create: refuses an Hours request missing startTime/endTime", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        timeOffCreate.execute({ personId: "p1", policyId: "pol1", kind: "Hours" }, ctx),
      ),
    Error,
    "startTime",
  );
});
