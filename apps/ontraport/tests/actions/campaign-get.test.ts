import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-get: calls GET /1/CampaignBuilderItem?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", name: "Test Campaign" }) }]);
  const out = await campaignGet.execute({ id: "1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/1/CampaignBuilderItem");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.name, "Test Campaign");
});
