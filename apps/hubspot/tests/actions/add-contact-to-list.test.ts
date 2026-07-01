import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-contact-to-list.ts";

Deno.test("add-contact-to-list: POSTs /contacts/v1/lists/{id}/add with emails+vids", async () => {
  const { ctx, calls } = mockCtx([{ body: { updated: [] } }]);
  await action.execute!({ listId: "42", emails: ["a@x"], vids: [7] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v1/lists/42/add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emails, ["a@x"]);
  assertEquals(body.vids, [7]);
});
