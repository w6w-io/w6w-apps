import { assertEquals, assertRejects } from "@std/assert";
import taskRun from "../../actions/task-run.ts";
import { mockCtx, pathOf, resultEnvelope } from "../_helpers.ts";

const TASK = { id: "t1", status: "in-progress", robotId: "r1", createdAt: 1 };

Deno.test("task-run: POSTs to /robots/{robotId}/tasks with inputParameters and recordVideo", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(TASK) }]);
  const out = await taskRun.execute(
    { robotId: "r1", inputParameters: { originUrl: "https://a.example" }, recordVideo: true },
    ctx,
  ) as typeof TASK;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/tasks");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    recordVideo: true,
    inputParameters: { originUrl: "https://a.example" },
  });
  assertEquals(out.id, "t1");
});

Deno.test("task-run: an absent inputParameters sends an empty body object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(TASK) }]);
  await taskRun.execute({ robotId: "r1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("task-run: inputParameters accepts the string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(TASK) }]);
  await taskRun.execute({ robotId: "r1", inputParameters: '{"limit":5}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { inputParameters: { limit: 5 } });
});

Deno.test("task-run: malformed inputParameters JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await taskRun.execute({ robotId: "r1", inputParameters: "{not json" }, ctx),
    Error,
    "Input parameters is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

/**
 * Browse AI's run endpoint accepts no idempotency key of any kind, so a retry
 * is a second billed task. The runtime reads this flag to decide whether it
 * may retry.
 */
Deno.test("task-run: is declared non-idempotent", () => {
  assertEquals(taskRun.idempotent, false);
});
