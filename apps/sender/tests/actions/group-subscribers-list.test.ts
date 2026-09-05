import { assertEquals } from "@std/assert";
import groupSubscribersList from "../../actions/group-subscribers-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-subscribers-list: GETs /v2/groups/{id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "s1" }]) }]);
  const out = await groupSubscribersList.execute({ id: "g1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/groups/g1/subscribers");
  assertEquals(out.data, [{ id: "s1" }]);
});
