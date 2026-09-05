import { assert, assertEquals } from "@std/assert";
import createContact from "../../actions/create-contact.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-contact: POSTs /v1/contacts with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: item("200", "contact", { first_name: "Bob", email: "bob@example.com" }),
  }]);
  const out = await createContact.execute(
    { firstName: "Bob", email: "bob@example.com" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Bob", email: "bob@example.com" });
  assertEquals(out.id, "200");
});

Deno.test("create-contact: never sets an Authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: item("1", "contact", {}) }]);
  await createContact.execute({ firstName: "Bob" }, ctx);
  assert(!("authorization" in calls[0].headers), "action set its own auth header");
});

Deno.test("create-contact: is marked non-idempotent", () => {
  assertEquals(createContact.idempotent, false);
});
