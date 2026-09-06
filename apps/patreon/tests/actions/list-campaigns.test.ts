import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

Deno.test("list-campaigns: GETs /campaigns with pagination and field params", async () => {
  const body = { data: [{ id: "1", type: "campaign" }], meta: { pagination: { total: 1 } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ count: 10, cursor: "abc", campaignFields: "created_at" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/campaigns");
  assertEquals(url.searchParams.get("page[count]"), "10");
  assertEquals(url.searchParams.get("page[cursor]"), "abc");
  assertEquals(url.searchParams.get("fields[campaign]"), "created_at");
  assertEquals(out, body);
});
