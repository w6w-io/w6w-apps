import { assertEquals } from "@std/assert";
import publishScheduleCreate from "../../actions/publish-schedule-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("publish-schedule-create: POSTs publishAt alongside the nested postDetail", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ scheduleId: "sch1" }) }]);
  const out = await publishScheduleCreate.execute({
    projectId: "P1",
    clipId: "C1",
    postAccountId: "pa1",
    publishAt: "2026-03-01T16:00:00.000Z",
    title: "My Post",
  }, ctx) as { scheduleId: string };

  assertEquals(pathOf(calls[0].url), "/api/publish-schedules");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.publishAt, "2026-03-01T16:00:00.000Z");
  assertEquals(body.postDetail, { title: "My Post" });
  assertEquals(out.scheduleId, "sch1");
});

Deno.test("publish-schedule-create: is declared non-idempotent", () => {
  assertEquals(publishScheduleCreate.idempotent, false);
});
