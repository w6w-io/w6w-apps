import { assertEquals } from "@std/assert";
import subscriberEventsGet from "../../actions/subscriber-events-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-events-get: sends actions as a JSON-array-literal query value", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: { got: [] }, sms: [] } }]);
  const out = await subscriberEventsGet.execute(
    { identifier: "a@b.com", actions: ["got"] },
    ctx,
  ) as { email: unknown };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/a%40b.com/events");
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("actions"), '["got"]');
  assertEquals(out.email, { got: [] });
});
