import { assertEquals } from "@std/assert";
import segmentGet from "../../actions/segment-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-get: GETs /v2/segments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "s1", name: "First segment" } } }]);
  const out = await segmentGet.execute({ id: "s1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v2/segments/s1");
  assertEquals(out.name, "First segment");
});
