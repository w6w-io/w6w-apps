import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rate-get.ts";

Deno.test("rate-get: reads GET /rates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object_id: "r1", provider: "USPS" } }]);
  const result = await action.execute!({ rateId: "r1" }, ctx) as { provider?: string };
  assertEquals(calls[0].url, "https://api.goshippo.com/rates/r1");
  assertEquals(result.provider, "USPS");
});

Deno.test("rate-get: `rateId` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "rateId");
  assertEquals(calls.length, 0);
});
