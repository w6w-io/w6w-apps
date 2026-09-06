import { assertEquals } from "@std/assert";
import batchOutputGet from "../../actions/batch-output-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-output-get: reads the response as raw JSONL text, not JSON", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: '{"custom_id":"1"}\n{"custom_id":"2"}',
      headers: { "content-type": "application/jsonl" },
    },
  ]);
  const out = await batchOutputGet.execute({ batchId: "b1" }, ctx) as { jsonl: string };

  assertEquals(pathOf(calls[0].url), "/v1/batch/b1/output");
  assertEquals(out.jsonl, '{"custom_id":"1"}\n{"custom_id":"2"}');
});
