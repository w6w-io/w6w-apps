import { assert, assertEquals, assertRejects } from "@std/assert";
import getContact from "../../actions/get-contact.ts";
import { mockCtx, pathOf, problemBody } from "../_helpers.ts";

Deno.test("get-contact: calls GET /contacts/{id} and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", email: "a@b.com" } }]);
  const out = await getContact.execute({ contactID: "c1" }, ctx) as { email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contacts/c1");
  assertEquals(out.email, "a@b.com");
});

Deno.test("get-contact: a contact id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await getContact.execute({ contactID: "c1/../../brands/current" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/contacts/c1%2F..%2F..%2Fbrands%2Fcurrent");
});

Deno.test("get-contact: a 404 surfaces the vendor's problem detail", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: problemBody("not-found", "Not Found", 404, { detail: "Contact not found" }),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(getContact.execute({ contactID: "nope" }, ctx)),
    Error,
  );
  assert(err.message.includes("Contact not found"), err.message);
});

Deno.test("get-contact: is a read action with no idempotency to declare", () => {
  assertEquals(getContact.type, "read");
});
