import { assertEquals } from "@std/assert";
import segmentSubscribersList from "../../actions/segment-subscribers-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("segment-subscribers-list: GETs /v2/segments/{id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "sub1" }]) }]);
  const out = await segmentSubscribersList.execute({ id: "s1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/segments/s1/subscribers");
  assertEquals(out.data, [{ id: "sub1" }]);
});
