import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/view-get-many.ts";

Deno.test("view-get-many: GETs /views with the category filter", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({ category: "user" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/views");
  assertEquals(url.searchParams.get("category"), "user");
});
