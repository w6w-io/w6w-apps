import { assertEquals } from "@std/assert";
import activityUpdate from "../../actions/activity-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("activity-update: PATCHes /activities/{id}.json with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 8 }) }]);
  await activityUpdate.execute({ id: 8, quantitySeconds: 1800 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/activities/8.json");
  assertEquals(JSON.parse(calls[0].body!), { data: { quantity: 1800 } });
});
