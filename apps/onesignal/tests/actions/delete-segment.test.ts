import { assertEquals } from "@std/assert";
import deleteSegment from "../../actions/delete-segment.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("delete-segment: DELETEs by id and returns the vendor's success body", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { success: true } }]);
  const out = await deleteSegment.execute({ segmentId: "seg-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/segments/seg-1`);
  assertEquals(out, { success: true });
});
