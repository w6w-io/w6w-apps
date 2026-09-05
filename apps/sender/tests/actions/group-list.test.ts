import { assertEquals } from "@std/assert";
import groupList from "../../actions/group-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-list: GETs /v2/groups and keeps meta", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "g1" }]) }]);
  const out = await groupList.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/groups");
  assertEquals(out.data, [{ id: "g1" }]);
});
