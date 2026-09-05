import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /Contacts with the contact fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { CONTACT_ID: 1 } }]);
  await action.execute({ firstName: "Jo", lastName: "Doe", emailAddress: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    FIRST_NAME: "Jo",
    LAST_NAME: "Doe",
    EMAIL_ADDRESS: "jo@acme.test",
  });
});

Deno.test("contact-create: drops unset optional fields rather than nulling them", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: {} }]);
  await action.execute({ firstName: "Jo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { FIRST_NAME: "Jo" });
});
