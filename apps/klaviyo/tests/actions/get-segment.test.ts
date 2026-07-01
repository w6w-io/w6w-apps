import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-segment.ts";

Deno.test("get-segment: GETs /segments/{id}/", async () => {
  const body = { data: { type: "segment", id: "s-1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ segmentId: "s-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/segments/s-1/");
  assertEquals(result, body);
});
