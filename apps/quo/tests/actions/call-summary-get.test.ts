import { assertEquals } from "@std/assert";
import callSummaryGet from "../../actions/call-summary-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-summary-get: GETs /v1/call-summaries/{callId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { callId: "call1", status: "completed" } },
  }]);
  await callSummaryGet.execute({ callId: "call1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/call-summaries/call1");
});

Deno.test("call-summary-get: is a read action", () => {
  assertEquals(callSummaryGet.type, "read");
});
