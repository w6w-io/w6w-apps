import { assertEquals } from "@std/assert";
import dealList from "../../actions/deal-list.ts";
import { listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("deal-list: maps hot/stageId filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await dealList.execute({ hot: true, stageId: 2 }, ctx) as {
    items: unknown[];
    count: number;
  };

  assertEquals(queryOf(calls[0].url), { hot: "true", stage_id: "2" });
  assertEquals(out.count, 1);
});
