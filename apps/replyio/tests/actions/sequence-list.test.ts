import { assertEquals } from "@std/assert";
import sequenceList from "../../actions/sequence-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sequence-list: GETs /v3/sequences with the given filters as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Cold outreach" }]) }]);
  const out = await sequenceList.execute({ status: "active", isArchived: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/sequences");
  assertEquals(queryOf(calls[0].url), { status: "active", isArchived: "false" });
  assertEquals(out, { items: [{ id: 1, name: "Cold outreach" }], hasMore: false });
});
