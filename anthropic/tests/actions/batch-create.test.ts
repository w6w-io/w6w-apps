import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-create.ts";

Deno.test("batch-create: POSTs /v1/messages/batches with requests array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "batch_1", processing_status: "in_progress" } }]);
  const requests = [
    {
      custom_id: "req-1",
      params: {
        model: "claude-opus-4-1-20250805",
        max_tokens: 128,
        messages: [{ role: "user", content: "hi" }],
      },
    },
  ];
  await action.execute!({ requests }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  // Batches is GA — no anthropic-beta required.
  assertEquals(calls[0].headers["anthropic-beta"], undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requests, requests);
});
