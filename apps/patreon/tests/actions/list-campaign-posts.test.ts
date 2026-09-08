import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaign-posts.ts";

Deno.test("list-campaign-posts: GETs /campaigns/{id}/posts", async () => {
  const body = { data: [{ id: "p1", type: "post" }], meta: { pagination: { total: 1 } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ campaignId: "999", postFields: "title,url", count: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/campaigns/999/posts");
  assertEquals(url.searchParams.get("fields[post]"), "title,url");
  assertEquals(url.searchParams.get("page[count]"), "20");
  assertEquals(out, body);
});
