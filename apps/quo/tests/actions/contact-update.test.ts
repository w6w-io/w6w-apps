import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes /v1/contacts/{id} with defaultFields nested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "c1" } } }]);
  await contactUpdate.execute(
    { id: "c1", firstName: "Jane", emails: [{ name: "work", value: "jane@example.com" }] },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.defaultFields.firstName, "Jane");
  assertEquals(body.defaultFields.emails, [{ name: "work", value: "jane@example.com" }]);
});

Deno.test("contact-update: omitting emails/phoneNumbers sends no key for them (full replace, caller's responsibility)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "c1" } } }]);
  await contactUpdate.execute({ id: "c1", firstName: "Jane" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("emails" in body.defaultFields, false);
  assertEquals("phoneNumbers" in body.defaultFields, false);
});

Deno.test("contact-update: is an idempotent perform action (full-replace semantics)", () => {
  assertEquals(contactUpdate.type, "perform");
  assertEquals(contactUpdate.idempotent, true);
});
