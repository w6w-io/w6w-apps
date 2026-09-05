import { assertEquals } from "@std/assert";
import affiliateGroupList from "../../actions/affiliate-group-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-group-list: lists all groups with no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "ag_eXampl3", title: "Gold affiliates" }] }]);
  const out = await affiliateGroupList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliate-groups/");
  assertEquals(out.items, [{ id: "ag_eXampl3", title: "Gold affiliates" }]);
});
