import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-results.ts";

Deno.test("batch-results: GETs /v1/messages/batches/{id}/results and decodes JSONL into an array", async () => {
  const jsonl = [
    `{"custom_id":"req-1","result":{"type":"succeeded","message":{"id":"msg_a"}}}`,
    `{"custom_id":"req-2","result":{"type":"errored","error":{"type":"invalid_request_error"}}}`,
  ].join("\n");
  const { ctx, calls } = mockCtx([
    { body: jsonl, headers: { "content-type": "application/x-jsonlines" } },
  ]);
  const result = await action.execute!({ batchId: "batch_1" }, ctx) as {
    results: Array<{ custom_id: string; result: { type: string } }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches/batch_1/results");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");

  // Critical: caller sees a real array, not a raw JSONL blob.
  assertEquals(Array.isArray(result.results), true);
  assertEquals(result.results.length, 2);
  assertEquals(result.results[0].custom_id, "req-1");
  assertEquals(result.results[0].result.type, "succeeded");
  assertEquals(result.results[1].custom_id, "req-2");
  assertEquals(result.results[1].result.type, "errored");
});

Deno.test("batch-results: tolerates trailing newline / blank lines", async () => {
  const jsonl = `{"custom_id":"a","result":{"type":"succeeded"}}\n\n`;
  const { ctx } = mockCtx([{ body: jsonl }]);
  const result = await action.execute!({ batchId: "batch_1" }, ctx) as {
    results: Array<{ custom_id: string }>;
  };
  assertEquals(result.results.length, 1);
  assertEquals(result.results[0].custom_id, "a");
});
