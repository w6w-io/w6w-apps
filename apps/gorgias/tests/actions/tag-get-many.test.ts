import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/tag-get-many.ts";

Deno.test("tag-get-many: GETs /tags with a search query", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({ search: "urg" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/tags");
  assertEquals(url.searchParams.get("search"), "urg");
});
