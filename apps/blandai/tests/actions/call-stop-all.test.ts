import { assertEquals } from "@std/assert";
import callStopAll from "../../actions/call-stop-all.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-stop-all: posts to /v1/calls/active/stop and maps num_calls", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "success", message: "Stopping active calls.", num_calls: 3 },
  }]);
  const out = await callStopAll.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/calls/active/stop");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.numCalls, 3);
});

Deno.test("call-stop-all: is declared idempotent", () => {
  assertEquals(callStopAll.idempotent, true);
});
