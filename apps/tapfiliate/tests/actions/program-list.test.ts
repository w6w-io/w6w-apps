import { assertEquals } from "@std/assert";
import programList from "../../actions/program-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("program-list: lists programs, optionally filtered by asset id", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "johns-affiliate-program" }] }]);
  const out = await programList.execute({ assetId: "1-aaaaaa" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/programs/");
  assertEquals(queryOf(calls[0].url), { asset_id: "1-aaaaaa" });
  assertEquals(out.items, [{ id: "johns-affiliate-program" }]);
});
