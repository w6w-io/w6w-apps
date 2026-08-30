import { assertEquals } from "@std/assert";
import webhookCreateMessage from "../../actions/webhook-create-message.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create-message: POSTs /v1/webhooks/messages with the given events/url/resourceIds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "WH1" } } }]);
  await webhookCreateMessage.execute(
    {
      events: ["message.received"],
      url: "https://example.com/hook",
      resourceIds: ["*"],
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/messages");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.events, ["message.received"]);
  assertEquals(body.url, "https://example.com/hook");
  assertEquals(body.resourceIds, ["*"]);
});

Deno.test("webhook-create-message: events param only offers the two message event types", () => {
  const events = webhookCreateMessage.params?.find((p) => p.key === "events");
  assertEquals(events?.options, [
    { value: "message.received", label: "Message received" },
    { value: "message.delivered", label: "Message delivered" },
  ]);
});

Deno.test("webhook-create-message: is a non-idempotent perform action", () => {
  assertEquals(webhookCreateMessage.type, "perform");
  assertEquals(webhookCreateMessage.idempotent, false);
});
