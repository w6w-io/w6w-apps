import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: hits /api/v1/campaigns with pagination defaults applied", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Donorbox New Campaign" }] }]);
  const out = await campaignList.execute({ per_page: 50, order: "desc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/campaigns");
  assertEquals(queryOf(calls[0].url), { per_page: "50", order: "desc" });
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("campaign-list: the campaign id filter is sent as `id`, not `campaign_id`", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await campaignList.execute({ id: 42 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.id, "42");
  assertEquals(query.campaign_id, undefined);
});

Deno.test("campaign-list: an unset name is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await campaignList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).name, undefined);
});

Deno.test("campaign-list: passes through the name filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await campaignList.execute({ name: "Save the jungle" }, ctx);
  assertEquals(queryOf(calls[0].url).name, "Save the jungle");
});
