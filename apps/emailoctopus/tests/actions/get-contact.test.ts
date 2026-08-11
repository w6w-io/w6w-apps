import { assertEquals } from "@std/assert";
import action from "../../actions/get-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-contact: GETs /lists/{listId}/contacts/{contactId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", email_address: "otto@example.com" } }]);
  const out = await action.execute!({ listId: "l1", contactId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts/c1");
  assertEquals(out, { id: "c1", email_address: "otto@example.com" });
});

Deno.test("get-contact: passes an email MD5 through the same path segment", async () => {
  // EmailOctopus documents `contact_id` as "the ID of the contact, or an MD5
  // hash of the lowercase version of the contact's email address".
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", contactId: "631251b876fece73bc9dd647fe596d5f" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/lists/l1/contacts/631251b876fece73bc9dd647fe596d5f",
  );
});

Deno.test("get-contact: is a read action", () => {
  assertEquals(action.type, "read");
});
