import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-contact-from-list.ts";

Deno.test("remove-contact-from-list: POSTs /contacts/v1/lists/{id}/remove with vids", async () => {
  const { ctx, calls } = mockCtx([{ body: { updated: [] } }]);
  await action.execute!({ listId: "42", vids: [7, 8] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v1/lists/42/remove");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.vids, [7, 8]);
});
