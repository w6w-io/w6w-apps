import { assertEquals } from "@std/assert";
import webhookCreateCallSummary from "../../actions/webhook-create-call-summary.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create-call-summary: POSTs /v1/webhooks/call-summaries", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "WH1" } } }]);
  await webhookCreateCallSummary.execute(
    { events: ["call.summary.completed"], url: "https://example.com/hook" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/call-summaries");
  assertEquals(JSON.parse(calls[0].body!).events, ["call.summary.completed"]);
});

Deno.test("webhook-create-call-summary: events param offers only call.summary.completed", () => {
  const events = webhookCreateCallSummary.params?.find((p) => p.key === "events");
  assertEquals(events?.options, [{
    value: "call.summary.completed",
    label: "Call summary completed",
  }]);
});

Deno.test("webhook-create-call-summary: is a non-idempotent perform action", () => {
  assertEquals(webhookCreateCallSummary.type, "perform");
  assertEquals(webhookCreateCallSummary.idempotent, false);
});
