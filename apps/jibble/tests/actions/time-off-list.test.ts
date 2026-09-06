import { assertEquals } from "@std/assert";
import timeOffList from "../../actions/time-off-list.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("time-off-list: calls GET /v1/TimeOffOverview", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "to1" }]) }]);
  const out = await timeOffList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/TimeOffOverview");
  assertEquals(out.items, [{ id: "to1" }]);
});
