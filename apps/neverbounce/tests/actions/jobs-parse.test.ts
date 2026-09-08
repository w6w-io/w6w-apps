import { assertEquals } from "@std/assert";
import jobsParse from "../../actions/jobs-parse.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("jobs-parse: posts job_id and auto_start, returns queue_id", async () => {
  const body = { status: "success", queue_id: "NB-PQ-59246392E9E5D", execution_time: 712 };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsParse.execute({ jobId: 289022, autoStart: true }, ctx);

  assertEquals(calls[0].method, "POST");
  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody, { job_id: 289022, auto_start: true });
  assertEquals(result, body);
});

Deno.test("jobs-parse: defaults auto_start to false", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", queue_id: "x", execution_time: 1 } },
  ]);

  await jobsParse.execute({ jobId: 1 }, ctx);

  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody.auto_start, false);
});
