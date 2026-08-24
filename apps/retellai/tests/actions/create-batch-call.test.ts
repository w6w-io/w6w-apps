import { assertEquals } from "@std/assert";
import createBatchCall from "../../actions/create-batch-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-batch-call: posts to /create-batch-call (no version prefix)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      batch_call_id: "batch_1",
      name: "First batch",
      from_number: "+14157774444",
      scheduled_timestamp: 1735718400,
      total_task_count: 1,
    },
  }]);

  const out = await createBatchCall.execute({
    fromNumber: "+14157774444",
    tasks: [{ toNumber: "+12137774445" }],
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/create-batch-call");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.from_number, "+14157774444");
  assertEquals(body.tasks, [{ to_number: "+12137774445" }]);
  assertEquals(out.batch_call_id, "batch_1");
});

Deno.test("create-batch-call: time windows use the vendor's start/end field names, not startMin/endMin", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { batch_call_id: "b1" } }]);

  await createBatchCall.execute({
    fromNumber: "+14157774444",
    tasks: [{ toNumber: "+12137774445" }],
    timeWindows: [{ startMin: 540, endMin: 1020 }],
    timeWindowTimezone: "America/Los_Angeles",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.call_time_window, {
    windows: [{ start: 540, end: 1020 }],
    timezone: "America/Los_Angeles",
  });
});

Deno.test("create-batch-call: reserved concurrency is passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { batch_call_id: "b1" } }]);
  await createBatchCall.execute({
    fromNumber: "+14157774444",
    tasks: [{ toNumber: "+1" }],
    reservedConcurrency: 5,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).reserved_concurrency, 5);
});

Deno.test("create-batch-call: is not idempotent — retrying would re-dial the whole batch", () => {
  assertEquals(createBatchCall.idempotent, false);
});
