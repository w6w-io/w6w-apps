import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

Deno.test("create-event: POSTs /events/ with nested metric+profile envelopes", async () => {
  // Klaviyo returns 202 Accepted with an empty body for the track event.
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await action.execute!(
    {
      metricName: "Placed Order",
      properties: { orderId: "o-1", total: 42 },
      profile: { email: "a@x.com", firstName: "Alice" },
      value: 42,
      valueCurrency: "USD",
      uniqueId: "o-1",
    },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/api/events/");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "event");
  assertEquals(sent.data.attributes.metric.data.attributes.name, "Placed Order");
  assertEquals(sent.data.attributes.profile.data.attributes.email, "a@x.com");
  assertEquals(sent.data.attributes.profile.data.attributes.first_name, "Alice");
  assertEquals(sent.data.attributes.properties.orderId, "o-1");
  assertEquals(sent.data.attributes.value, 42);
  assertEquals(sent.data.attributes.value_currency, "USD");
  assertEquals(sent.data.attributes.unique_id, "o-1");
});
