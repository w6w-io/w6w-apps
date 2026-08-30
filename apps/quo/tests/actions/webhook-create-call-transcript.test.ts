import { assertEquals } from "@std/assert";
import webhookCreateCallTranscript from "../../actions/webhook-create-call-transcript.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create-call-transcript: POSTs /v1/webhooks/call-transcripts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "WH1" } } }]);
  await webhookCreateCallTranscript.execute(
    { events: ["call.transcript.completed"], url: "https://example.com/hook" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/call-transcripts");
  assertEquals(JSON.parse(calls[0].body!).events, ["call.transcript.completed"]);
});

Deno.test("webhook-create-call-transcript: events param offers only call.transcript.completed", () => {
  const events = webhookCreateCallTranscript.params?.find((p) => p.key === "events");
  assertEquals(events?.options, [{
    value: "call.transcript.completed",
    label: "Call transcript completed",
  }]);
});

Deno.test("webhook-create-call-transcript: is a non-idempotent perform action", () => {
  assertEquals(webhookCreateCallTranscript.type, "perform");
  assertEquals(webhookCreateCallTranscript.idempotent, false);
});
