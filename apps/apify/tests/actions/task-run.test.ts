import { assertEquals } from "@std/assert";
import taskRun from "../../actions/task-run.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const RUN = envelope({ id: "r1", status: "READY", defaultDatasetId: "d1" });

Deno.test("task-run: POSTs to /v2/actor-tasks/{id}/runs", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  const out = await taskRun.execute({ taskId: "t1", timeout: 120 }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actor-tasks/t1/runs");
  assertEquals(queryOf(calls[0].url), { timeout: "120" });
  assertEquals(out.id, "r1");
});

/**
 * The task's stored input is used untouched when nothing is overridden. Sending
 * `{}` instead would be read as an override of nothing, which is the same thing
 * here — but sending no body at all is what the vendor documents, and keeps the
 * distinction visible if that ever stops being true.
 */
Deno.test("task-run: sends no body when there is nothing to override", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  await taskRun.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("task-run: overrides are sent as the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RUN }]);
  await taskRun.execute({ taskId: "t1", input: { maxItems: 5 } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { maxItems: 5 });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("task-run: is declared non-idempotent", () => {
  assertEquals(taskRun.idempotent, false);
});
