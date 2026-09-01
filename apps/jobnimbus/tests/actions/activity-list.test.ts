import { assertEquals } from "@std/assert";
import activityList from "../../actions/activity-list.ts";
import { listPage, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("activity-list: hits /activities and returns {count, results}", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ jnid: "n1" }]) }]);
  const out = await activityList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/activities");
  assertEquals(out, { count: 1, results: [{ jnid: "n1" }] });
});
