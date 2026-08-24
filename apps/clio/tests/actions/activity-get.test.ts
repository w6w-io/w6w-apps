import { assertEquals } from "@std/assert";
import activityGet from "../../actions/activity-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("activity-get: calls GET /activities/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 8, quantity: 3600, price: 200 }) }]);
  const out = await activityGet.execute({ id: 8 }, ctx) as { quantity: number };
  assertEquals(pathOf(calls[0].url), "/api/v4/activities/8.json");
  assertEquals(out.quantity, 3600);
});
