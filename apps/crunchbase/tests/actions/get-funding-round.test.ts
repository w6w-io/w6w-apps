import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-funding-round.ts";

Deno.test("get-funding-round: GETs the funding_rounds entity path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: { money_raised: {} } } }]);
  await action.execute!({ entityId: "series-a-acme" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.crunchbase.com/v4/data/entities/funding_rounds/series-a-acme",
  );
});

Deno.test("get-funding-round: entityId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId`");
  assertEquals(calls.length, 0);
});
