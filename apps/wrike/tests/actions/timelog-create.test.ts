import { assertEquals } from "@std/assert";
import timelogCreate from "../../actions/timelog-create.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timelog-create: POSTs to /tasks/{taskId}/timelogs with the required fields", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "TL1", hours: 2, trackedDate: "2026-09-01" }]) },
  ]);
  const out = await timelogCreate.execute(
    { taskId: "T1", hours: 2, trackedDate: "2026-09-01", comment: "worked on it" },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1/timelogs");
  assertEquals(queryOf(calls[0].url), {
    hours: "2",
    trackedDate: "2026-09-01",
    comment: "worked on it",
  });
  assertEquals(out.id, "TL1");
});

Deno.test("timelog-create: hours validation matches Wrike's documented 0–24 range", () => {
  const p = timelogCreate.params?.find((p) => p.key === "hours");
  assertEquals(p?.validation?.min, 0);
  assertEquals(p?.validation?.max, 24);
});

Deno.test("timelog-create: is declared non-idempotent — a retry books time twice", () => {
  assertEquals(timelogCreate.idempotent, false);
});
