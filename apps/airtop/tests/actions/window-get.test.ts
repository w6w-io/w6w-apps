import { assertEquals } from "@std/assert";
import windowGet from "../../actions/window-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("window-get: reads window info with the live-view query options", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ windowId: "w1", targetId: "t1", liveViewUrl: "https://live.airtop.ai/w1" }),
  }]);
  const out = await windowGet.execute(
    { sessionId: "s1", windowId: "w1", includeNavigationBar: true, screenResolution: "1280x720" },
    ctx,
  ) as { liveViewUrl: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1");
  assertEquals(queryOf(calls[0].url), {
    includeNavigationBar: "true",
    screenResolution: "1280x720",
  });
  assertEquals(out.liveViewUrl, "https://live.airtop.ai/w1");
});
