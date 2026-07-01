import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-drafts.ts";

Deno.test("get-many-drafts: applies default maxResults=100 at users/me/drafts", async () => {
  const { ctx, calls } = mockCtx([{ body: { drafts: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/drafts");
  assertEquals(url.searchParams.get("maxResults"), "100");
});
