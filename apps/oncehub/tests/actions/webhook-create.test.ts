import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

Deno.test("webhook-create: POSTs /webhooks with name, url and events", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "WHK-1" } }]);
  await action.execute(
    {
      name: "New bookings",
      url: "https://example.com/hooks/oncehub",
      events: ["booking.scheduled", "booking.canceled"],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "New bookings",
    url: "https://example.com/hooks/oncehub",
    events: ["booking.scheduled", "booking.canceled"],
  });
});

Deno.test("webhook-create: declares all 10 documented event types as options", () => {
  const events = action.params?.find((p) => p.key === "events");
  const values = (events?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.length, 10);
  assertEquals(values.includes("booking.scheduled"), true);
  assertEquals(values.includes("conversation.closed"), true);
});
