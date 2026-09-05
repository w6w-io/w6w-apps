import { assertEquals } from "@std/assert";
import segmentDelete from "../../actions/segment-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-delete: DELETEs /v2/segments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Filter deleted" } }]);
  await segmentDelete.execute({ id: "s1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/segments/s1");
});
