import { assertEquals } from "@std/assert";
import segmentList from "../../actions/segment-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-list: GETs /v2/segments/", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "s1" }]) }]);
  const out = await segmentList.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/segments/");
  assertEquals(out.data, [{ id: "s1" }]);
});
