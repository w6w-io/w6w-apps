import { assertEquals } from "@std/assert";
import activityList from "../../actions/activity-list.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("activity-list: calls GET /v1/Activities", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "a1" }]) }]);
  const out = await activityList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/Activities");
  assertEquals(out.items, [{ id: "a1" }]);
});
