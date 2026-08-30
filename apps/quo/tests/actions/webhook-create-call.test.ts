import { assertEquals } from "@std/assert";
import webhookCreateCall from "../../actions/webhook-create-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create-call: POSTs /v1/webhooks/calls with the given events/url", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "WH1" } } }]);
  await webhookCreateCall.execute(
    { events: ["call.completed", "call.ringing"], url: "https://example.com/hook" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/calls");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.events, ["call.completed", "call.ringing"]);
});

Deno.test("webhook-create-call: events param offers the three legacy call event types", () => {
  const events = webhookCreateCall.params?.find((p) => p.key === "events");
  assertEquals(events?.options, [
    { value: "call.completed", label: "Call completed" },
    { value: "call.ringing", label: "Call ringing" },
    { value: "call.recording.completed", label: "Call recording completed" },
  ]);
});

Deno.test("webhook-create-call: is a non-idempotent perform action", () => {
  assertEquals(webhookCreateCall.type, "perform");
  assertEquals(webhookCreateCall.idempotent, false);
});
