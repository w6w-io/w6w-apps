import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-draft.ts";

Deno.test("get-draft: GETs users/me/drafts/{id} with format=full by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute!({ draftId: "d1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/drafts/d1");
  assertEquals(url.searchParams.get("format"), "full");
});
