import { assertEquals } from "@std/assert";
import campaignListsAndSegmentsGet from "../../actions/campaign-lists-and-segments-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

/** An object with two arrays, not a flat list. */
Deno.test("campaign-lists-and-segments-get: returns Lists and Segments separately", async () => {
  const body = {
    Lists: [{ ListID: "l1", Name: "List One" }],
    Segments: [{ ListID: "l1", SegmentID: "s1", Title: "Segment One" }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await campaignListsAndSegmentsGet.execute({ campaignId: "cmp" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/listsandsegments.json`);
  assertEquals(out.Lists, body.Lists);
  assertEquals(out.Segments, body.Segments);
});
