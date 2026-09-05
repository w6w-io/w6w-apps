import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("campaign-list: GETs the Asset API browse endpoint with default paging", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1001 }, { id: 1002 }] } },
  ], conn);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/asset/v1/smartCampaigns.json");
  assertEquals(url.searchParams.get("maxReturn"), "20");
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.has("isActive"), false);
  assertEquals(out, [{ id: 1001 }, { id: 1002 }]);
});

Deno.test("campaign-list: passes isActive through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [] } }], conn);
  await action.execute!({ isActive: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("isActive"), "true");
});
