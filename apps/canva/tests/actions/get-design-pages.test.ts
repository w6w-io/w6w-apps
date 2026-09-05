import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design-pages.ts";

Deno.test("get-design-pages: GETs /rest/v1/designs/{id}/pages with offset/limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ designId: "abc123", offset: 2, limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/designs/abc123/pages");
  assertEquals(url.searchParams.get("offset"), "2");
  assertEquals(url.searchParams.get("limit"), "10");
});
