import { assertEquals } from "@std/assert";
import listSegmentsGet from "../../actions/list-segments-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-segments-get: GETs /lists/{listid}/segments.json", async () => {
  const segments = [{ ListID: "lid", SegmentID: "s1", Title: "Segment One" }];
  const { ctx, calls } = mockCtx([{ body: segments }]);
  const out = await listSegmentsGet.execute({ listId: "lid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/lid/segments.json`);
  assertEquals(out, segments);
});
