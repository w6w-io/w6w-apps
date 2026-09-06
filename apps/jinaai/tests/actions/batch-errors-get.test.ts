import { assertEquals } from "@std/assert";
import batchErrorsGet from "../../actions/batch-errors-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-errors-get: reads the response as raw JSONL text, not JSON", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: '{"custom_id":"1","error":"bad input"}',
      headers: { "content-type": "application/jsonl" },
    },
  ]);
  const out = await batchErrorsGet.execute({ batchId: "b1" }, ctx) as { jsonl: string };

  assertEquals(pathOf(calls[0].url), "/v1/batch/b1/errors");
  assertEquals(out.jsonl, '{"custom_id":"1","error":"bad input"}');
});
