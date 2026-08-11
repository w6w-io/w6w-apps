import { assertEquals } from "@std/assert";
import clientSegmentsGet from "../../actions/client-segments-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-segments-get: GETs /clients/{clientid}/segments.json", async () => {
  const segments = [{ ListID: "l1", SegmentID: "s1", Title: "Segment One" }];
  const { ctx, calls } = mockCtx([{ body: segments }]);
  const out = await clientSegmentsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/segments.json`);
  // Each segment names the list it belongs to — that is why this is useful.
  assertEquals(out[0].ListID, "l1");
});
