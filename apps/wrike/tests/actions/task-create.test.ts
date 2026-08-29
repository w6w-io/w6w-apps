import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-create: POSTs to /folders/{folderId}/tasks with a JSON-encoded dates object", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "T1", title: "Ship it", status: "Active" }]) },
  ]);
  const out = await taskCreate.execute(
    { folderId: "F1", title: "Ship it", dates: { start: "2026-09-01", due: "2026-09-05" } },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null, "Wrike takes fields as query params, never a body");
  assertEquals(pathOf(calls[0].url), "/api/v4/folders/F1/tasks");
  assertEquals(queryOf(calls[0].url), {
    title: "Ship it",
    dates: '{"start":"2026-09-01","due":"2026-09-05"}',
  });
  assertEquals(out.id, "T1");
});

Deno.test("task-create: accepts dates as a hand-typed JSON string too", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "T1" }]) }]);
  await taskCreate.execute(
    { folderId: "F1", title: "x", dates: '{"duration":480}' },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).dates, '{"duration":480}');
});

Deno.test("task-create: malformed dates JSON fails before any request is made", async () => {
  const { ctx, calls } = mockWrikeCtx([]);
  let threw = false;
  try {
    await taskCreate.execute({ folderId: "F1", title: "x", dates: "{not json" }, ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Dates is not valid JSON");
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("task-create: is declared non-idempotent — no idempotency key exists on this endpoint", () => {
  assertEquals(taskCreate.idempotent, false);
});

Deno.test("task-create: rawParams can reach an unmodeled field", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "T1" }]) }]);
  await taskCreate.execute(
    { folderId: "F1", title: "x", rawParams: { workScheduleId: "IEAAAAAAAAAAAAAA" } },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).workScheduleId, "IEAAAAAAAAAAAAAA");
});
