import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: hits /campaigns with pagination defaults applied", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "1" }]) }]);
  const out = await campaignList.execute({ page: 1, per_page: 20 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/campaigns");
  assertEquals(queryOf(calls[0].url), { page: "1", per_page: "20" });
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("campaign-list: an unset scope is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await campaignList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).scope, undefined);
});
