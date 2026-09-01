import { assertEquals } from "@std/assert";
import subscriptionPause from "../../actions/subscription-pause.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-pause: defaults pause_at to 'now'", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "paused" } }]);
  await subscriptionPause.execute({ id: "sub_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/sub_1/pause");
  assertEquals(JSON.parse(calls[0].body!), { pause_at: "now" });
});

Deno.test("subscription-pause: honours an explicit cycle_end", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1" } }]);
  await subscriptionPause.execute({ id: "sub_1", pauseAt: "cycle_end" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { pause_at: "cycle_end" });
});
