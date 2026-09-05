import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-create.ts";

Deno.test("track-create: posts carrier and tracking number to /tracks", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      carrier: "usps",
      tracking_number: "9205590164917312751089",
      tracking_status: { status: "TRANSIT" },
    },
  }]);
  const result = await action.execute!(
    { carrier: "usps", trackingNumber: "9205590164917312751089" },
    ctx,
  ) as { tracking_status?: { status?: string } };
  assertEquals(calls[0].url, "https://api.goshippo.com/tracks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    carrier: "usps",
    tracking_number: "9205590164917312751089",
  });
  assertEquals(result.tracking_status?.status, "TRANSIT");
});

Deno.test("track-create: `carrier` and `trackingNumber` are both required", async () => {
  for (const missing of ["carrier", "trackingNumber"]) {
    const input: Record<string, unknown> = { carrier: "usps", trackingNumber: "123" };
    input[missing] = "";
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0);
  }
});

Deno.test("track-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
