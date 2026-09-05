import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-brand-templates.ts";

Deno.test("list-brand-templates: GETs /rest/v1/brand-templates with query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ query: "ad", dataset: "non_empty", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/brand-templates");
  assertEquals(url.searchParams.get("query"), "ad");
  assertEquals(url.searchParams.get("dataset"), "non_empty");
  assertEquals(url.searchParams.get("limit"), "5");
});
