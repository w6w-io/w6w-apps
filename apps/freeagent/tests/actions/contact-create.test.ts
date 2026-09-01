import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs a root `contact` object with only the fields given", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { contact: { url: "x" } } }]);
  await action.execute({ organisationName: "Acme Ltd" }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { contact: { organisation_name: "Acme Ltd" } });
});

Deno.test("contact-create: merges additionalFields using FreeAgent's own field names", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { contact: { url: "x" } } }]);
  await action.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    additionalFields: { email: "ada@example.com", town: "London" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contact.first_name, "Ada");
  assertEquals(body.contact.last_name, "Lovelace");
  assertEquals(body.contact.email, "ada@example.com");
  assertEquals(body.contact.town, "London");
});
