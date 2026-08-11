import { assert, assertEquals, assertRejects } from "@std/assert";
import contactUpdate, { deriveUpdateMask } from "../../actions/contact-update.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

const UPDATED = { id: "42", given_name: "Jo" };

Deno.test("contact-update: PATCHes the contact by id", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await contactUpdate.execute({ contactId: "42", givenName: "Jo" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42");
  assertEquals(JSON.parse(calls[0].body!), { given_name: "Jo" });
});

/**
 * The finding this action exists to defend against. Every collection property
 * on `CreateUpdateContactRequest` carries "Any item not listed here will be
 * removed if it already exists", so a PATCH without an `update_mask` clears
 * what it does not mention.
 */
Deno.test("contact-update: always sends an update mask, derived from what was filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await contactUpdate.execute({ contactId: "42", givenName: "Jo", jobTitle: "CTO" }, ctx);
  assertEquals(queryAll(calls[0].url, "update_mask"), ["given_name", "job_title"]);
});

/**
 * `update_mask` is an array parameter whose enum members are bare property
 * names, so a comma-joined value is not a member of it. `fields`, whose own
 * description says "Comma-delimited", is joined instead.
 */
Deno.test("contact-update: the mask is a repeated key, and fields is comma-delimited", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await contactUpdate.execute(
    { contactId: "42", givenName: "Jo", jobTitle: "CTO", fields: "id,given_name" },
    ctx,
  );
  const values = queryAll(calls[0].url, "update_mask");
  assertEquals(values.length, 2);
  assert(!values.some((v) => v.includes(",")), "the mask was comma-joined");
  assertEquals(queryOf(calls[0].url).fields, "id,given_name");
});

Deno.test("contact-update: an explicit mask overrides the derived one", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await contactUpdate.execute(
    { contactId: "42", givenName: "Jo", updateMask: "given_name, family_name" },
    ctx,
  );
  assertEquals(queryAll(calls[0].url, "update_mask"), ["given_name", "family_name"]);
});

/**
 * An empty derivation would send no mask at all and re-open the destructive
 * path, so it is refused rather than defaulted.
 */
Deno.test("contact-update: an empty update is refused rather than sent maskless", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactUpdate.execute({ contactId: "42" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: extra properties are added to the mask automatically", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await contactUpdate.execute({ contactId: "42", extra: '{"website":"https://x.com"}' }, ctx);
  assertEquals(queryAll(calls[0].url, "update_mask"), ["website"]);
});

Deno.test("contact-update: is declared idempotent — the same PATCH twice is the same contact", () => {
  assertEquals(contactUpdate.idempotent, true);
});

Deno.test("deriveUpdateMask names exactly the properties the body carries", () => {
  assertEquals(deriveUpdateMask({ given_name: "Jo", job_title: "CTO" }), [
    "given_name",
    "job_title",
  ]);
  assertEquals(deriveUpdateMask({}), []);
});

Deno.test("contact-update: the email hint warns that it replaces the whole list", () => {
  const param = contactUpdate.params?.find((p) => p.key === "email");
  assert(/whole email list/.test(param?.hint ?? ""));
});
