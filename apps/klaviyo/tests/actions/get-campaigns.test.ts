import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaigns.ts";

Deno.test("get-campaigns: GETs /campaigns/ with the required channel filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ filter: "equals(messages.channel,'email')" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/campaigns/");
  assertEquals(url.searchParams.get("filter"), "equals(messages.channel,'email')");
  assertEquals(url.searchParams.get("sort"), "-send_time");
});
