import { assertEquals } from "@std/assert";
import jobActivityList from "../../actions/jobactivity-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("jobactivity-list: calls GET /jobactivity.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "a1" }] }]);
  const out = await jobActivityList.execute({ filter: "activity_was_scheduled eq 1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/jobactivity.json");
  assertEquals(queryOf(calls[0].url), { "$filter": "activity_was_scheduled eq 1" });
  assertEquals(out.items, [{ uuid: "a1" }]);
});
