import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: hits /api/mailing/campaigns", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Welcome" }]) }]);
  await campaignList.execute({ limit: 15 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/campaigns");
  assertEquals(queryOf(calls[0].url), { limit: "15" });
});
