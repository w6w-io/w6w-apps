import { assert, assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { bodyOf, entityBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor flags this itself: "This request is a POST method, and not a PUT
 * method!" Every other update in this app is a PUT, which is exactly why this
 * one gets written wrong.
 */
Deno.test("contact-update: uses POST, not PUT", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("contact", { id: 710 }) }]);
  await contactUpdate.execute({ contactId: "710", firstName: "Vicente UPDATED" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/710");
  assertEquals(bodyOf(calls[0]), { first_name: "Vicente UPDATED" });
});

/** "Can't be blank if defined" — so a blank must be dropped, not sent as "". */
Deno.test("contact-update: blank fields are dropped rather than sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("contact", {}) }]);
  await contactUpdate.execute(
    { contactId: "710", firstName: "Gary", lastName: "", companyName: "Lerox" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { first_name: "Gary", company_name: "Lerox" });
});

Deno.test("contact-update: an empty change set is rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(contactUpdate.execute({ contactId: "710" }, ctx)),
    Error,
  );
  assert(err.message.includes("at least one field"), err.message);
  assertEquals(calls.length, 0);
});
