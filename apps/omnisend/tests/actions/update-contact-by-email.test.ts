import { assert, assertEquals, assertRejects } from "@std/assert";
import updateContactByEmail from "../../actions/update-contact-by-email.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("update-contact-by-email: PATCHes /contacts with email as a query param, not in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", email: "a@b.com" } }]);
  await updateContactByEmail.execute({ email: "a@b.com", firstName: "Ada" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.firstName, "Ada");
  assertEquals("email" in body, false);
});

Deno.test("update-contact-by-email: a 404 (no matching contact) surfaces as an error", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: problemBody("not-found", "Not Found", 404, { detail: "No contact with that email" }),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(updateContactByEmail.execute({ email: "nobody@example.com" }, ctx)),
    Error,
  );
  assert(err.message.includes("No contact with that email"), err.message);
});

Deno.test("update-contact-by-email: is marked idempotent", () => {
  assertEquals(updateContactByEmail.idempotent, true);
  assertEquals(updateContactByEmail.type, "perform");
});
