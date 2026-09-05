import { assertEquals } from "@std/assert";
import estimateRecipients from "../../actions/estimate-recipients.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("estimate-recipients: posts to count-unsaved and returns the estimate, no message sent", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 200, body: { count: 42, cap_applied: false } },
  ]);
  const out = await estimateRecipients.execute({ includedSegments: "Subscribed Users" }, ctx);
  assertEquals(pathOf(calls[0].url), "/notifications/count-unsaved");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.app_id, APP_ID);
  assertEquals(body.included_segments, ["Subscribed Users"]);
  assertEquals(out, { count: 42, cap_applied: false });
});
