import { assertEquals } from "@std/assert";
import segmentList from "../../actions/segment-list.ts";
import { entries, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-list: lists a list's segments", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1, name: "Engaged" }]) }]);
  const out = await segmentList.execute({ accountId: "1", listId: "2" }, ctx) as {
    entries: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/segments");
  assertEquals(out.entries.length, 1);
});
