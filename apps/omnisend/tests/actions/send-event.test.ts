import { assertEquals } from "@std/assert";
import sendEvent from "../../actions/send-event.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-event: POSTs to /events and returns undefined for the 202", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await sendEvent.execute({ eventName: "placed order" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/events");
  assertEquals(out, undefined);
});

Deno.test("send-event: forwards every documented EventRequest field", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await sendEvent.execute({
    eventName: "placed order",
    origin: "my-app",
    eventID: "9afca57b-d157-478b-adde-b9506322b16f",
    eventTime: "2021-07-01T00:00:00Z",
    eventVersion: "v1",
    properties: { orderID: "o1", total: 42 },
    contact: { email: "a@b.com" },
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    eventName: "placed order",
    origin: "my-app",
    eventID: "9afca57b-d157-478b-adde-b9506322b16f",
    eventTime: "2021-07-01T00:00:00Z",
    eventVersion: "v1",
    properties: { orderID: "o1", total: 42 },
    contact: { email: "a@b.com" },
  });
});

Deno.test("send-event: omitted optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await sendEvent.execute({ eventName: "my custom event" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["eventName"]);
});

Deno.test("send-event: eventName is required, origin defaults to api", () => {
  const eventName = sendEvent.params?.find((p) => p.key === "eventName");
  const origin = sendEvent.params?.find((p) => p.key === "origin");
  assertEquals(eventName?.required, true);
  assertEquals(origin?.default, "api");
});

/**
 * Event deduplication via eventID+eventTime only applies to historical event
 * ingestion, per Omnisend's own docs — not to the real-time events used for
 * automations. Marking this idempotent would let the runtime silently
 * collapse a retried, genuinely-new trigger.
 */
Deno.test("send-event: is NOT marked idempotent", () => {
  assertEquals(sendEvent.idempotent, false);
  assertEquals(sendEvent.type, "perform");
});
