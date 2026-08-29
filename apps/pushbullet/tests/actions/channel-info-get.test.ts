import { assertEquals } from "@std/assert";
import channelInfoGet from "../../actions/channel-info-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("channel-info-get: GETs /v2/channel-info with tag and no_recent_pushes", async () => {
  const { ctx, calls } = mockCtx([
    { body: { iden: "ch1", name: "Elon Musk News", subscriber_count: 9382239 } },
  ]);
  const out = await channelInfoGet.execute(
    { tag: "elonmusknews", noRecentPushes: true },
    ctx,
  ) as { subscriberCount: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/channel-info");
  assertEquals(queryOf(calls[0].url), { tag: "elonmusknews", no_recent_pushes: "true" });
  assertEquals(out.subscriberCount, 9382239);
});

Deno.test("channel-info-get: does not require a Connection — the vendor's own example is unauthenticated", () => {
  assertEquals(channelInfoGet.requiresAuth, false);
});
