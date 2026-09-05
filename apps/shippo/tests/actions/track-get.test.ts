import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-get.ts";

Deno.test("track-get: reads GET /tracks/{carrier}/{trackingNumber}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { carrier: "usps", tracking_status: { status: "DELIVERED" } },
  }]);
  const result = await action.execute!(
    { carrier: "usps", trackingNumber: "9205590164917312751089" },
    ctx,
  ) as { tracking_status?: { status?: string } };
  assertEquals(calls[0].url, "https://api.goshippo.com/tracks/usps/9205590164917312751089");
  assertEquals(result.tracking_status?.status, "DELIVERED");
});

Deno.test("track-get: `carrier` and `trackingNumber` are both required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ carrier: "usps" }, ctx),
    Error,
    "trackingNumber",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track-get: is read-only", () => {
  assertEquals(action.type, "read");
});
