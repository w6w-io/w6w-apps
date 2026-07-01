import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-forms.ts";

Deno.test("list-forms: GETs /marketing/v3/forms/", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ limit: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/marketing/v3/forms/");
  assertEquals(url.searchParams.get("limit"), "25");
});
