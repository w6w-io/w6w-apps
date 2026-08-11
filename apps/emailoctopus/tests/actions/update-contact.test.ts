import { assert, assertEquals } from "@std/assert";
import action from "../../actions/update-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-contact: PUTs /lists/{listId}/contacts/{contactId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ listId: "l1", contactId: "c1", status: "unsubscribed" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts/c1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "unsubscribed" });
});

Deno.test("update-contact: sends an empty body when nothing was supplied", async () => {
  // Every attribute is optional on this endpoint; it is a partial despite being a PUT.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", contactId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("update-contact: tags is the tag -> boolean object, and false removes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    listId: "l1",
    contactId: "c1",
    emailAddress: "new@example.com",
    fields: { FirstName: null },
    tags: { vip: false },
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email_address, "new@example.com");
  assertEquals(sent.fields, { FirstName: null });
  assert(!Array.isArray(sent.tags));
  assertEquals(sent.tags, { vip: false });
});
