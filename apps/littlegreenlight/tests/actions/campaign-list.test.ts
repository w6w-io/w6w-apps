import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: hits /api/v1/campaigns.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, name: "Annual fund" }]) }]);
  const out = await campaignList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/campaigns.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("campaign-list: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await campaignList.execute({ limit: 5, offset: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
});
